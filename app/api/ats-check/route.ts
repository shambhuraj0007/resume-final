import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hasCredits, deductCredits } from "@/payment/creditService";
import { CREDIT_COSTS } from "@/payment/config";
import connectDB from "@/lib/mongodb";
import AnalysisResult from "@/models/AnalysisResult";
import { openRouterQueue } from "@/lib/requestQueue";
import {
  calculateScores,
  computeStructuralFit,
} from "@/lib/scoring/scoreEngine";
import { generateDeterministicSuggestions } from "@/lib/scoring/suggestionGenerator";
import type { LLMExtractionResult, Suggestion } from "@/lib/scoring/interfaces";
import { matchSkillLists } from "@/lib/scoring/skillMatcher";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get user ObjectId
    const User = (await import("@/models/User")).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = (user._id as any).toString();

    // Check if user has enough credits
    const hasSufficientCredits = await hasCredits(
      userId,
      CREDIT_COSTS.ATS_CHECK
    );

    if (!hasSufficientCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: `You need ${CREDIT_COSTS.ATS_CHECK} credit to analyze a resume. Please purchase more credits.`,
          requiredCredits: CREDIT_COSTS.ATS_CHECK,
        },
        { status: 402 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File;
    const jobDescription = formData.get("jobDescription") as string;

    if (!resumeFile || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    // Extract resume text
    let resumeText = "";
    const fileName = resumeFile.name;

    if (resumeFile.type === "application/pdf") {
      // Extract PDF text using existing endpoint logic
      const pdfParse = require("pdf-parse");
      const buffer = await resumeFile.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(buffer));
      resumeText = pdfData.text;
    } else if (
      resumeFile.type === "text/plain" ||
      fileName.endsWith(".txt")
    ) {
      resumeText = await resumeFile.text();
    } else {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or text file." },
        { status: 400 }
      );
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Resume text is empty or could not be extracted" },
        { status: 400 }
      );
    }



    // Call LLM for data extraction (not scoring)
    const llmData = await extractDataFromLLM(resumeText, jobDescription);

    // ------------------------------------------------------------------------
    // ENHANCED FUZZY MATCHING (User Request)
    // ------------------------------------------------------------------------
    // Re-calculate matches and missing skills using robust fuzzy logic (acronyms, etc.)
    const requiredSkillNames = llmData.requiredSkills.map(s => s.name);
    const resumeSkillNames = llmData.resumeSkills.map(s => s.name);

    const matchResult = matchSkillLists(requiredSkillNames, resumeSkillNames);

    // Update missing skills list with our calculated list
    llmData.missingSkills = matchResult.missing;

    // Update resume skills with new match info
    // This ensures scoring engine sees the fuzzy matches
    matchResult.matched.forEach((match: { required: string; candidate: string }) => {
      const resumeSkill = llmData.resumeSkills.find(rs => rs.name === match.candidate);
      if (resumeSkill) {
        // If LLM missed this match or we want to enforce our fuzzy match
        if (!resumeSkill.jdSkillName || resumeSkill.matchType === 'none') {
          resumeSkill.jdSkillName = match.required;
          resumeSkill.matchType = 'synonym'; // Fuzzy/Acronym match
        }
      }
    });
    // ------------------------------------------------------------------------

    // Calculate scores using deterministic engine
    const scoringResult = calculateScores(llmData);

    // ------------------------------------------------------------------------
    // DYNAMIC SUGGESTION COUNT (User Request)
    // ------------------------------------------------------------------------
    // Inverse relationship: Lower score = More suggestions
    let suggestionCount = 5;
    if (scoringResult.currentScore < 50) suggestionCount = 10;
    else if (scoringResult.currentScore < 75) suggestionCount = 7;
    else if (scoringResult.currentScore < 90) suggestionCount = 5;
    else suggestionCount = 3;

    // Filter suggestions to the determined count
    // Assumes LLM returned them sorted by impact as requested
    llmData.suggestions = llmData.suggestions.slice(0, suggestionCount);
    // ------------------------------------------------------------------------

    // Generate deterministic suggestions
    const deterministicSuggestions = generateDeterministicSuggestions(
      llmData,
      scoringResult.structuralFit,
      scoringResult.scoreBreakdown.title ? scoringResult.scoreBreakdown.title / 10 : 0, // Approx similarity from score
      llmData.candidateTitle || "Candidate"
    );

    // Merge suggestions: Deterministic first (Tickable), then LLM (Text/Other)
    const allSuggestions = [
      ...deterministicSuggestions,
      ...llmData.suggestions
    ];

    // Categorize suggestions
    const textSuggestions = allSuggestions.filter(
      (s) => s.category === "text"
    );
    const keywordSuggestions = allSuggestions.filter(
      (s) => s.category === "keyword"
    );
    const otherSuggestions = allSuggestions.filter(
      (s) => s.category === "other"
    );

    // Extract top required keywords (Ensure at least 10 if available)
    const topRequiredKeywords = llmData.requiredSkills
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10)
      .map((s) => s.name);

    // Get matched skills (Limit to top 10)
    const matchedSkills = llmData.resumeSkills
      .filter((rs) => rs.matchType !== "none" && rs.jdSkillName)
      .slice(0, 10)
      .map((rs) => ({
        skill: rs.name,
        matchType: rs.matchType,
        locations: rs.locations,
      }));

    // Limit missing skills to top 10 for display
    const missingKeywords = llmData.missingSkills.slice(0, 10);

    // Ensure potential score is at least 5% higher than current score
    if (scoringResult.potentialScore < scoringResult.currentScore + 5) {
      scoringResult.potentialScore = Math.min(scoringResult.currentScore + 5, 100);
    }

    // Create analysis result
    const analysisResult = new AnalysisResult({
      userId: user._id,
      resumeText,
      jobDescription,
      fileName,
      currentScore: scoringResult.currentScore,
      potentialScore: scoringResult.potentialScore,
      currentCallback: scoringResult.currentCallback,
      potentialCallback: scoringResult.potentialCallback,
      keywords: llmData.resumeSkills.map((s) => s.name),
      topRequiredKeywords,
      missingKeywords,
      suggestions: allSuggestions,
      textSuggestions,
      keywordSuggestions,
      otherSuggestions,
      evidence: {
        matchedResponsibilities: llmData.responsibilities.topJDResponsibilities.map(
          (r) => ({
            jdFragment: r,
            resumeFragment: "", // LLM could provide this
          })
        ),
        matchedSkills: matchedSkills.map((m) => ({
          skill: m.skill,
          resumeFragment: "", // LLM could provide this
        })),
      },
      scoreBreakdown: scoringResult.scoreBreakdown,
      confidence: 0.85, // Fixed confidence for deterministic scoring
      isValidJD: true,
      isValidCV: true,
      // New deterministic scoring fields
      structuralFit: scoringResult.structuralFit,
      requiredSkills: llmData.requiredSkills,
      matchedSkills,
      experienceBreakdown: {
        requiredYears: llmData.experience.requiredYears,
        candidateYears: llmData.experience.candidateYears,
        requiredSeniority: llmData.experience.requiredSeniority,
        candidateSeniority: llmData.experience.candidateSeniority,
      },
      educationBreakdown: {
        requiredDegree: llmData.education.requiredDegreeLevel,
        candidateDegree: llmData.education.candidateDegreeLevel,
        meetsMinimum: llmData.education.meetsMinimum,
        bonusTierInstitution: llmData.education.bonusTierInstitution,
      },
    });

    await analysisResult.save();

    // Deduct credits AFTER successful save
    await deductCredits(
      userId,
      CREDIT_COSTS.ATS_CHECK,
      "ats_check",
      (analysisResult._id as any).toString(),
      fileName
    );

    return NextResponse.json({
      currentScore: scoringResult.currentScore,
      potentialScore: scoringResult.potentialScore,
      currentCallback: scoringResult.currentCallback,
      potentialCallback: scoringResult.potentialCallback,
      keywords: llmData.resumeSkills.map((s) => s.name),
      topRequiredKeywords,
      missingKeywords: llmData.missingSkills,
      suggestions: allSuggestions,
      textSuggestions,
      keywordSuggestions,
      otherSuggestions,
      scoreBreakdown: scoringResult.scoreBreakdown,
      confidence: 0.85,
      isValidJD: true,
      isValidCV: true,
      structuralFit: scoringResult.structuralFit,
      matchedSkills,
      insufficentExperience: llmData.experience.candidateYears < llmData.experience.requiredYears,
      experienceRequired: llmData.experience.requiredYears,
      experienceHas: llmData.experience.candidateYears,
      rawLLMData: llmData, // For frontend simulation
      analysisId: (analysisResult._id as any).toString(),
      resumeText,
      jobDescription,
    });
  } catch (error) {
    console.error("Error in ATS check:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Extract structured data from resume and job description using LLM
 */
async function extractDataFromLLM(
  resumeText: string,
  jobDescription: string
): Promise<LLMExtractionResult> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const prompt = `You are a MASTER  AI for an ATS (Applicant Tracking System). Your job is to extract structured data from a resume and job description and identify specific improvements about text and overall structure for the resume.

---

RESUME TEXT:
"""
${resumeText}
"""

---

JOB DESCRIPTION:
"""
${jobDescription}
"""

---

TASK: Extract the following information in strict JSON format. Do not generate a numeric score, but DO analyze the content to provide actionable suggestions.

1. **requiredSkills**: Array of All skills from the job description. For each skill:
   - name: string (skill name from JD)
   - importance: number (1=nice-to-have, 2=important, 3=critical/must-have)
   - type: "hard" or "soft" (technical skills vs soft skills)

2. **resumeSkills**: Array of All skills found in the resume. For each skill:
   - name: string (skill name as written in resume)
   - jdSkillName: string (matching skill name from requiredSkills, or "" if no match)
   - matchType: "exact" | "synonym" | "related" | "none"
   - locations: array of where found (options: "title", "summary", "skills", "recent_experience", "other_experience", "other")

3. **mustHaveSkills**: Array of critical skill names from JD (importance=3)

4. **missingSkills**: Array of must-have skill names that are NOT in the resume all missing skills from the jd that re not in resSUME

5. **experience**:
   - requiredYears: number (years of full-time experience required by JD) if not mentioned or unable to get it assume it to be 0 but strictly try to catch it.
   - candidateYears: number (years of FULL-TIME experience from resume. EXCLUDE internships, part-time work, and contract roles. Count only professional, full-time employment after graduation)

6. **education**:
   - requiredDegreeLevel: "none" | "diploma" | "bachelor" | "master" | "phd"
   - candidateDegreeLevel: "none" | "diploma" | "bachelor" | "master" | "phd"
   - meetsMinimum: boolean (does candidate meet minimum education requirement?)
   - bonusTierInstitution: boolean (is it IIT, IIMA, MIT, Stanford, or other top-tier institution?)

7. **responsibilities**:
   - topJDResponsibilities: array of  key responsibilities from JD
   - matchedResponsibilitiesCount: number (how many of those responsibilities are evident in resume)
   - totalResponsibilitiesConsidered: number (should equal length of topJDResponsibilities)

8. **titles**:
   - jdTitle: string (job title from JD)
   - candidateCurrentTitle: string (current/most recent job title from resume)
   - candidateRecentTitles: array of recent job titles from resume
   - titleSimilarity: number 0.0-1.0 (how similar is candidate's title to JD title)
   - suggestedTitle: string (an optimized title for the candidate based on the JD, if the current one is a mismatch. Otherwise empty string;most of time unless it has low score <4 .)

9. **formatSignals**:
   - hasStandardSections: boolean (does resume have clear experience/education/skills sections?)
   - isParseable: boolean (is the text well-formatted and readable?)
   - hasContactInfo: boolean (does resume have email/phone?)

10. **suggestions**: Array of concrete improvement suggestions. For each:
    - suggestion: string (what to do). Provide EXACTLY 10 suggestions, sorted by highest impact first. The system will filter these based on the candidate's score.
    - originalText: string (current text from resume, or "MISSING" if adding new content)
    - improvedText: string (suggested rewrite or new text to add)
    - category: "text" | "keyword" | "other"
    - requiresUserConfirmation: boolean (true if suggesting to add experience they might not have)

---

STRICT OUTPUT SCHEMA (EXAMPLE):

Here is an example JSON object. Follow this exact structure and key names in your response. Use the same top-level keys and nested keys, but with values derived from the resume and job description:

{
  "requiredSkills": [
    {
      "name": "JavaScript",
      "importance": 3,
      "type": "hard"
    }
  ],
  "resumeSkills": [
    {
      "name": "React",
      "jdSkillName": "React.js",
      "matchType": "exact",
      "locations": ["skills", "recent_experience"]
    }
  ],
  "mustHaveSkills": ["JavaScript"],
  "missingSkills": ["TypeScript"],
  "experience": {
    "requiredYears": 3,
    "candidateYears": 4
  },
  "education": {
    "requiredDegreeLevel": "bachelor",
    "candidateDegreeLevel": "bachelor",
    "meetsMinimum": true,
    "bonusTierInstitution": false
  },
  "responsibilities": {
    "topJDResponsibilities": [
      "Develop and maintain web applications",
      "Collaborate with cross-functional teams"
    ],
    "matchedResponsibilitiesCount": 2,
    "totalResponsibilitiesConsidered": 2
  },
  "titles": {
    "jdTitle": "Frontend Developer",
    "candidateCurrentTitle": "Software Engineer",
    "candidateRecentTitles": [
      "Frontend Engineer",
      "Software Engineer"
    ],
    "titleSimilarity": 0.8,
    "suggestedTitle": "Senior Frontend Developer"
  },
  "formatSignals": {
    "hasStandardSections": true,
    "isParseable": true,
    "hasContactInfo": true
  },
  "suggestions": [
    {
      "suggestion": "Add TypeScript to your skills section to match the job description.",
      "originalText": "MISSING",
      "improvedText": "Proficient in TypeScript for building scalable web applications.",
      "category": "keyword",
      "requiresUserConfirmation": false
    }
  ]
}

---

CRITICAL RULES:
- Return ONLY valid JSON matching this exact structure (same keys and nesting as the example)
- DO NOT add commentary, explanations, or scoring
- DO NOT invent skills or experience not present in the resume
- For suggestions, be specific and actionable and give at leat 2 suggetions about text languge of resume.
- If information is unclear, make reasonable assumptions
- All fields must be present (use empty arrays/strings/0 if no data)

Return the JSON now:`;

  const response = await openRouterQueue.add(() =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://shortlistai.xyz",
        "X-Title": "ShortlistAI",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 4096,
      }),
    })
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenRouter API error:", response.status, errorBody);
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content received from OpenRouter API");
  }

  try {
    const result = JSON.parse(content) as LLMExtractionResult;
    return result;
  } catch (parseError) {
    console.error("Failed to parse LLM response:", content);
    throw new Error("LLM returned invalid JSON format");
  }
}
