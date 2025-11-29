import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { hasCredits, deductCredits } from '@/payment/creditService';
import { CREDIT_COSTS } from '@/payment/config';
import AnalysisResult from '@/models/AnalysisResult';
import { openRouterQueue } from '@/lib/requestQueue';
const pdfParse = require('pdf-parse');

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
}

interface CompatibilityResult {
  currentScore: number;
  potentialScore: number;
  currentCallback: number;
  potentialCallback: number;
  keywords: string[];
  topRequiredKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
  textSuggestions: Suggestion[];
  keywordSuggestions: Suggestion[];
  otherSuggestions: Suggestion[];
  evidence: {
    matchedResponsibilities: Array<{ jdFragment: string; resumeFragment: string }>;
    matchedSkills: Array<{ skill: string; resumeFragment: string }>;
  };
  scoreBreakdown: {
    requiredSkills: number;
    experience: number;
    responsibilities: number;
    education: number;
    industry: number;
  };
  confidence: number;
  isValidJD: boolean;
  isValidCV: boolean;
  validationWarning?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (user._id as any).toString();

    // Check credits BEFORE processing
    const hasSufficientCredits = await hasCredits(
      userId,
      CREDIT_COSTS.RESUME_ANALYSIS
    );

    if (!hasSufficientCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.RESUME_ANALYSIS
        },
        { status: 402 }
      );
    }

    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!resumeFile) {
      return NextResponse.json({ error: "No resume uploaded" }, { status: 400 });
    }

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    // Extract text from PDF or plain text
    let resumeText: string;

    if (resumeFile.type === 'application/pdf') {
      const pdfBuffer = Buffer.from(await resumeFile.arrayBuffer());
      const pdfData = await pdfParse(pdfBuffer);
      resumeText = pdfData.text;
    } else {
      // Handle plain text file
      resumeText = await resumeFile.text();
    }

    // Validate Resume
    const { isValidResume } = await import("@/lib/resume-validation");
    // Note: For plain text files, we don't have page count, so we pass undefined
    const numPages = resumeFile.type === 'application/pdf' ? (await pdfParse(Buffer.from(await resumeFile.arrayBuffer()))).numpages : undefined;

    const validationResult = isValidResume(resumeText, numPages);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: validationResult.reason,
          details: validationResult.details
        },
        { status: 400 }
      );
    }

    console.log("Extracted resume text:", resumeText.substring(0, 200));

    // Call OpenRouter AI for job description compatibility analysis
    const compatibilityResult = await analyzeWithOpenRouter(resumeText, jobDescription);

    // Save analysis result to database
    try {
      const analysisRecord = new AnalysisResult({
        userId,
        resumeText,
        jobDescription,
        fileName: resumeFile.name,
        currentScore: compatibilityResult.currentScore,
        potentialScore: compatibilityResult.potentialScore,
        currentCallback: compatibilityResult.currentCallback,
        potentialCallback: compatibilityResult.potentialCallback,
        keywords: compatibilityResult.keywords,
        topRequiredKeywords: compatibilityResult.topRequiredKeywords,
        missingKeywords: compatibilityResult.missingKeywords,
        suggestions: compatibilityResult.suggestions,
        textSuggestions: compatibilityResult.textSuggestions,
        keywordSuggestions: compatibilityResult.keywordSuggestions,
        otherSuggestions: compatibilityResult.otherSuggestions,
        evidence: compatibilityResult.evidence,
        scoreBreakdown: compatibilityResult.scoreBreakdown,
        confidence: compatibilityResult.confidence,
        isValidJD: compatibilityResult.isValidJD,
        isValidCV: compatibilityResult.isValidCV,
        validationWarning: compatibilityResult.validationWarning,
      });

      const savedAnalysis = await analysisRecord.save();
      console.log('✅ Analysis result saved to database:', savedAnalysis._id);

      // Add analysisId to response
      const responseData = {
        ...compatibilityResult,
        analysisId: (savedAnalysis._id as any).toString(),
      };

      // Deduct credits AFTER successful analysis and storage
      await deductCredits(
        userId,
        CREDIT_COSTS.RESUME_ANALYSIS,
        'resume_analysis',
        undefined,
        resumeFile.name
      );

      return NextResponse.json(responseData);
    } catch (dbError) {
      console.error('Error saving analysis to database:', dbError);
      // Still deduct credits even if DB save fails
      try {
        await deductCredits(
          userId,
          CREDIT_COSTS.RESUME_ANALYSIS,
          'resume_analysis',
          undefined,
          resumeFile.name
        );
      } catch (creditError) {
        console.error('Error deducting credits:', creditError);
      }

      // Return analysis result anyway, but with error note
      return NextResponse.json({
        ...compatibilityResult,
        dbError: 'Analysis completed but could not be saved to history',
      });
    }
  } catch (error) {
    console.error("Error in compatibility check:", error);

    // Handle specific quota error
    if (error instanceof Error && error.message === "INSUFFICIENT_QUOTA") {
      return NextResponse.json(
        { error: "AI Service quota exceeded. Please try again later." },
        { status: 402 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


async function analyzeWithOpenRouter(resumeText: string, jobDescription: string): Promise<CompatibilityResult> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  console.log('API Key exists:', !!OPENROUTER_API_KEY);
  console.log('API Key length:', OPENROUTER_API_KEY?.length);

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const prompt = `You are an expert Resume & Job Description Alignment Analyst combining expertise from Senior Technical Recruiters, ATS (Applicant Tracking System) Engineers, and Hiring Managers across multiple domains.

Your objective: Evaluate how well a candidate's resume matches a specific job description and return an evidence-based JSON report optimized for ATS success and realistic recruiter callback probability.

---

PRE-VALIDATION STATUS:
The input documents have been pre-validated using a hybrid detection model with the following checks:

HARD LIMITS (Already Passed):
- Page Count: Maximum 5 pages ✓
- Word Count: Maximum 10,000 words ✓
- Minimum Text Length: Exceeds 100 characters ✓

SCORING VALIDATION (Score ≥7/20 achieved):
- Section Headers: Education, Experience, Skills, Projects, Certifications detected
- Contact Patterns: Email, phone, LinkedIn/GitHub/portfolio links found
- Structural Signals: Bullet points, date ranges, job role patterns present

This pre-validation confirms document authenticity. Your task is to perform RIGOROUS DEEP SEMANTIC ANALYSIS with strict scoring standards.

---

INPUT VALIDATION REQUIREMENTS:
Despite pre-validation, perform final sanity checks:

Resume/CV Validation Criteria:
- Red flags: Looks like a job posting, contains "we are looking for", "responsibilities include"

Job Description Validation Criteria:
- Must contain job title, role description, or position details
- Must contain requirements, qualifications, or responsibilities
- Should include company expectations or desired skills
- Typical length: 300-8,000 characters
- Red flags: Looks like a resume, contains "I have experience in", personal pronouns about candidate

If Resume appears to be a JD: Set isValidCV=false, validationWarning="The resume text appears to be a job description. Please provide your actual resume/CV."
If JD appears to be a Resume: Set isValidJD=false, validationWarning="The job description appears to be a resume. Please provide the actual job posting."
If both are invalid or swapped: Set both to false, validationWarning="The inputs appear to be swapped or invalid. Please ensure you paste your resume in the resume field and the job description in the JD field."
If inputs are too short (<200 chars each): Return error JSON

---

INPUT REQUIREMENTS:
- Resume Text: Plain UTF-8 string (max 20,000 characters). Parsed OCR-safe resume text including all sections (Experience, Skills, Education, etc.).
- Job Description: Plain UTF-8 string (max 15,000 characters). Full job posting text.
- Minimum valid input: 200 characters each.

If inputs are invalid, return: {"error":"INVALID_INPUT","errorCode":"TEXT_TOO_SHORT"}

---

COMPATIBILITY SCORING CRITERIA (Total 100 points):

BE STRICT AND REALISTIC IN SCORING - Most resumes score 40-70, not 80+.

1. Required Skills Match (30 points)
   - Frequency and semantic overlap of required skills from JD
   - Use fuzzy + semantic matching for synonyms and abbreviations
   - Examples: "AI" ↔ "Artificial Intelligence", "AWS" ↔ "Amazon Web Services"
   - Scoring: (matched_required / total_required) × 30
   - Partial matches: exact = 1.0, synonym = 0.7, related = 0.5
   - PENALTY: Missing even 1 critical skill reduces score by 5+ points

2. Experience Relevance (25 points)
   - Years and type of experience alignment
   - Scoring: min(candidateYears / requiredYears, 1.0) × 25
   - Derive years from role dates and duration
   - Consider seniority level match (junior/mid/senior)
   - PENALTY: Mismatched seniority level reduces by 10 points

3. Responsibilities Alignment (20 points)
   - How well past roles match job requirements
   - Scoring: (matchedResponsibilities / top8JDResponsibilities) × 20
   - Match past duties with JD expectations using strict semantic similarity
   - PENALTY: Generic descriptions without specifics reduce by 5 points

4. Education & Certifications (15 points)
   - Degree and certification requirements
   - Scoring: exact match = 15, partial = 7, missing = 0
   - STRICT: "Bachelor's required" but candidate has only Associate's = 0 points

5. Industry & Domain Fit (10 points)
   - Relevant industry experience and sector-level relevance
   - Scoring: (matchedIndustryKeywords / totalIndustryKeywords) × 10
   - STRICT: Completely different industry = maximum 3 points

---

SCORING METHODOLOGY:

Current Score Calculation:
- Calculate weighted sum of all 5 criteria
- Round to nearest integer (0-100)
- BE HARSH: 90+ means near-perfect match (rare), 70-80 is strong, 50-60 is average
- Missing 2+ required skills → maximum score of 65
- Wrong seniority level → maximum score of 70
- Irrelevant experience does NOT count positively
- Vague or generic language without metrics → reduce by 10%

Potential Score Calculation:
- Current score + realistic improvement gain (typically +8 to +15 points)
- Based on implementable suggestions only
- Maximum cap: 100
- DO NOT promise >20 point gains unless major gaps can be filled

---

CALLBACK PROBABILITY MAPPING:

Calculate realistic interview/callback chances:

| Current Score Range | Callback Probability Range |
|---------------------|----------------------------|
| 0-30                | 5-15%                      |
| 30-50               | 15-35%                     |
| 50-70               | 35-60%                     |
| 70-85               | 60-80%                     |
| 85-100              | 80-95%                     |

Adjustments (±10%):
- Add 10% if candidate has rare/high-demand skills (AI/ML specialist, blockchain, etc.)
- Subtract 10% if significantly overqualified or underqualified
- Subtract 5% if missing hard requirements (certifications, clearances)
- Consider current market demand for the specific role

---

ANALYSIS REQUIREMENTS:

1. Extract and match  keywords/skills from JD that CURRENTLY APPEAR in the resume not more than 10.
2. Identify top 10 MOST IMPORTANT keywords/skills from JD (regardless of whether they appear in resume)
3. Identify MISSING critical keywords/skills NOT in resume but required by JD (not more than 8)
4. Provide COMPREHENSIVE improvement suggestions (NO LIMIT - provide as many as needed, typically 10-30+):
   
   CATEGORIZE each suggestion into one of three types:
   
   a) TEXT IMPROVEMENTS ("text"):
      - Rewriting existing resume content for better ATS optimization
      - Improving bullet points, descriptions, and achievements
      - Making language more impactful and quantifiable
      - Adding metrics, percentages, and concrete results
      - Reformatting or restructuring existing content
      - Removing vague language and replacing with specifics
   
   b) KEYWORD IMPROVEMENTS ("keyword"):
      - Adding missing critical keywords from the job description
      - Incorporating technical skills, tools, or technologies
      - Including industry-specific terminology
      - Adding certifications or qualifications mentioned in JD
      - Spelling out acronyms and their abbreviations
   
   c) OTHER IMPROVEMENTS ("other"):
      - Structural changes (adding sections, reordering)
      - Format recommendations
      - General strategy suggestions
      - Soft skills or cultural fit improvements
      - Any suggestions that don't fit text or keyword categories

5. For EACH suggestion, provide:
   - The exact sentence/phrase from resume that needs improvement (or "MISSING" if not present)
   - A rewritten replacement sentence optimized for ATS and job match
   - The category: "text", "keyword", or "other"
   
6. Include matched responsibilities with exact text fragments
7. Include matched skills with resume context
8. Calculate confidence score (0-100) based on text quality and clarity

BE THOROUGH: Provide many suggestions for comprehensive improvement. Don't hold back.

---

REQUIRED OUTPUT FORMAT (STRICT JSON ONLY):

{
  "isValidCV": boolean,                // true if resume input is actually a resume/CV
  "isValidJD": boolean,                // true if job description input is actually a JD
  "validationWarning": string,         // Optional warning message if validation fails
  "currentScore": number,              // 0-100, how well resume currently matches
  "potentialScore": number,            // 0-100, estimated score after improvements
  "currentCallback": number,           // 0-100, current interview probability
  "potentialCallback": number,         // 0-100, potential probability after improvements
  "keywords": [string],                // Top  matched keywords FOUND in resume upto 10
  "topRequiredKeywords": [string],     // Top 10 most important keywords from JD (priority order)
  "missingKeywords": [string],         // upto 8 critical missing keywords from JD
  "suggestions": [
    {
      "suggestion": string,            // The actionable improvement tip
      "originalText": string,          // Exact sentence from resume to replace (or "MISSING" if not present)
      "improvedText": string,          // Recommended replacement sentence for resume
      "category": string               // "text", "keyword", or "other"
    }
  ],                                   // NO LIMIT - provide  comprehensive suggestions
  "textSuggestions": [                 // All text improvement suggestions
    {
      "suggestion": string,
      "originalText": string,
      "improvedText": string,
      "category": "text"
    }
  ],
  "keywordSuggestions": [              // All keyword improvement suggestions
    {
      "suggestion": string,
      "originalText": string,
      "improvedText": string,
      "category": "keyword"
    }
  ],
  "otherSuggestions": [                // All other improvement suggestions
    {
      "suggestion": string,
      "originalText": string,
      "improvedText": string,
      "category": "other"
    }
  ],
  "evidence": {
    "matchedResponsibilities": [
      {
        "jdFragment": string,          // Exact text from job description
        "resumeFragment": string       // Matching text from resume
      }
    ],
    "matchedSkills": [
      {
        "skill": string,               // Skill name
        "resumeFragment": string       // Context from resume showing skill
      }
    ]
  },
  "scoreBreakdown": {                  // Detailed scoring transparency
    "requiredSkills": number,          // 0-30 points
    "experience": number,              // 0-25 points
    "responsibilities": number,        // 0-20 points
    "education": number,               // 0-15 points
    "industry": number                 // 0-10 points
  },
  "confidence": number                 // 0-100, analysis confidence level
}

---

CRITICAL RULES:
- FIRST validate inputs: Set isValidCV and isValidJD appropriately
- If validation fails, still provide analysis but include validationWarning
- Return ONLY valid JSON, no additional text or markdown code blocks
- All numbers must be integers (rounded to nearest whole number)
- All probabilities capped at [0, 100]
- "keywords" must contain ONLY matches found in BOTH documents (not more than  10 items) no keywords foound if 0
- "topRequiredKeywords" must contain the 10 MOST CRITICAL skills/keywords from JD ranked by importance
- "missingKeywords" must contain critical terms from JD that are ABSENT in resume (5-10 items)
- Provide COMPREHENSIVE suggestions ( recommendations, NO LIMIT - be thorough)
- Each suggestion object MUST include all FOUR fields: suggestion, originalText, improvedText, category
- Category must be exactly "text", "keyword", or "other"
- Populate textSuggestions, keywordSuggestions, and otherSuggestions arrays by filtering suggestions by category
- All suggestions array should contain ALL suggestions, while the categorized arrays contain filtered subsets
- If originalText is missing from resume, use "MISSING" as the value
- improvedText must be a complete, ready-to-use sentence for the resume
- Evidence fragments must be exact quotes from source documents
- If unable to parse or analyze, return error JSON with explanation
- Only analyze the requirements from the given job description and preferred qualifications
- BE STRICT in scoring - most resumes are not 90+, be realistic
-consider only the job requiremnets and similar contents from the JD only dont consider other irrelavant things from JD.


Resume Text: """${resumeText}"""

Job Description: """${jobDescription}"""`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'https://resume-optimizer.com',
    'X-Title': 'Resume Optimizer',
  };

  // Using OpenRouter's OpenAI-compatible endpoint, rate-limited via openRouterQueue
  const response = await openRouterQueue.add(() =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",  // or "gemini-2.5-flash" or "gemini-2.5-pro"
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      }),
    })
  );

  // Handle quota/rate limit errors
  if (response.status === 429) {
    const errorBody = await response.text();
    console.error("OpenRouter 429 Error (Rate Limit):", errorBody);
    throw new Error("INSUFFICIENT_QUOTA");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', response.status, response.statusText, errorBody);
    throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();

  // Check if response was truncated
  if (data.choices[0].finish_reason === 'length') {
    console.warn('Warning: AI response was truncated due to max_tokens limit');
  }

  const messageContent = data.choices[0].message.content;

  // Validate JSON before parsing
  if (!messageContent || messageContent.trim().length === 0) {
    throw new Error('Empty response from AI');
  }

  try {
    const result = JSON.parse(messageContent);
    return result;
  } catch (parseError) {
    console.error('JSON Parse Error:', parseError);
    console.error('Raw content:', messageContent.substring(0, 500));
    throw new Error('Invalid JSON response from AI. The response may have been truncated.');
  }
}
