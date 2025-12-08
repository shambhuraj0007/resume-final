import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { hasCredits, deductCredits } from '@/payment/creditService';
import { CREDIT_COSTS } from '@/payment/config';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';
import AnalysisResult from '@/models/AnalysisResult';
import { openRouterQueue } from '@/lib/requestQueue';

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
}

interface OptimizeResumeRequest {
  analysisId?: string;
  resumeText?: string;
  jobDescription?: string;
  suggestions?: Suggestion[];
  missingKeywords?: string[];
  currentScore?: number;
  potentialScore?: number;
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

    // Get user ObjectId
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (user._id as any).toString();
    const userEmail = session.user.email;

    // Check if user has enough credits
    const hasSufficientCredits = await hasCredits(userId, CREDIT_COSTS.RESUME_OPTIMIZATION);

    if (!hasSufficientCredits) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: `You need ${CREDIT_COSTS.RESUME_OPTIMIZATION} credits to optimize a resume. Please purchase more credits.`,
          requiredCredits: CREDIT_COSTS.RESUME_OPTIMIZATION
        },
        { status: 402 } // Payment Required
      );
    }

    const body: OptimizeResumeRequest = await req.json();
    const { analysisId, resumeText, jobDescription, suggestions, missingKeywords } = body;

    // Start with whatever the client provided
    let finalResumeText = resumeText;
    let finalJobDescription = jobDescription;
    let finalSuggestions = suggestions;
    let finalMissingKeywords = missingKeywords || [];

    // If required fields are missing but we have an analysisId, load them from AnalysisResult
    if ((!finalResumeText || !finalJobDescription || !finalSuggestions || finalSuggestions.length === 0) && analysisId) {
      const fullAnalysis = await AnalysisResult.findOne({
        _id: analysisId,
        userId,
      });

      if (!fullAnalysis) {
        return NextResponse.json(
          { error: 'Analysis not found' },
          { status: 404 }
        );
      }

      if (!finalResumeText) finalResumeText = fullAnalysis.resumeText;
      if (!finalJobDescription) finalJobDescription = fullAnalysis.jobDescription;
      if (!finalSuggestions || finalSuggestions.length === 0) {
        finalSuggestions = (fullAnalysis as any).suggestions || [];
      }
      if (!finalMissingKeywords || finalMissingKeywords.length === 0) {
        finalMissingKeywords = (fullAnalysis as any).missingKeywords || [];
      }
    }

    // Still missing critical data even after DB fallback
    if (!finalResumeText || !finalJobDescription || !finalSuggestions || finalSuggestions.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call OpenRouter AI to generate structured resume data
    const optimizedResumeData = await generateOptimizedResume(
      finalResumeText,
      finalJobDescription,
      finalSuggestions,
      finalMissingKeywords
    );

    // Generate user-friendly resume ID with username and date
    const username = optimizedResumeData.personalDetails?.fullName
      ? optimizedResumeData.personalDetails.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      : 'optimized_user';
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS format
    let resumeId = `${username}_${dateStr}_${timeStr}`;

    // Ensure unique resumeId by checking if it already exists
    let counter = 1;
    let originalResumeId = resumeId;
    while (await Resume.findOne({ resumeId })) {
      resumeId = `${originalResumeId}_${counter}`;
      counter++;
    }

    const newResume = new Resume({
      userId: userEmail,
      userEmail: userEmail,
      resumeId,
      personalDetails: optimizedResumeData.personalDetails,
      objective: optimizedResumeData.objective || '',
      jobTitle: optimizedResumeData.jobTitle || '',
      workExperience: (optimizedResumeData.workExperience || []).map((exp) => ({
        ...exp,
        description: Array.isArray(exp.description) ? exp.description.join('\n') : exp.description,
      })),
      education: optimizedResumeData.education || [],
      skills: optimizedResumeData.skills || [],
      projects: optimizedResumeData.projects || [],
      languages: optimizedResumeData.languages || [],
      certifications: optimizedResumeData.certifications || [],
      customSections: optimizedResumeData.customSections || [],
      template: 'modern', // Default template for optimized resumes
      accentColor: optimizedResumeData.accentColor || '#3b82f6',
      fontFamily: optimizedResumeData.fontFamily || 'Inter',
      showIcons: optimizedResumeData.showIcons !== undefined ? optimizedResumeData.showIcons : true,
    });

    await newResume.save();

    // Deduct credits AFTER successful optimization and save, using the MongoDB ObjectId
    await deductCredits(
      userId,
      CREDIT_COSTS.RESUME_OPTIMIZATION,
      'resume_optimization',
      (newResume._id as any).toString(),
      `${optimizedResumeData.personalDetails?.fullName || 'Optimized'}_Resume.pdf`
    );

    return NextResponse.json({
      ...optimizedResumeData,
      resumeId, // Include resumeId in response
    });
  } catch (error) {
    console.error("Error in resume optimization:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function generateOptimizedResume(
  resumeText: string,
  jobDescription: string,
  suggestions: Suggestion[],
  missingKeywords: string[]
): Promise<any> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const prompt = `You are an expert Resume Optimization AI that transforms resumes to maximize ATS (Applicant Tracking System) compatibility and job match scores.

Your task: Generate a complete, structured resume in JSON format that incorporates all the improvement suggestions while maintaining the candidate's authentic experience and qualifications.

---

CRITICAL REQUIREMENTS:

1. **Preserve Authenticity**: Only include real experiences, skills, and qualifications from the original resume. DO NOT fabricate experiences.

2. **Apply ALL Suggestions**: Incorporate every suggestion provided, replacing original text with improved versions.

3. **Add Missing Keywords Naturally**: Integrate missing keywords into appropriate sections where they genuinely fit based on the candidate's background.

4. **Optimize for ATS**: Use clear formatting, relevant keywords, action verbs, and quantifiable achievements.

5. **Maintain Professional Tone**: Keep language professional, concise, and impactful.

---

INPUT DATA:

Original Resume Text:
"""
${resumeText}
"""

Target Job Description:
"""
${jobDescription}
"""

Improvement Suggestions to Apply:
${JSON.stringify(suggestions, null, 2)}

Missing Critical Keywords to Integrate:
${JSON.stringify(missingKeywords, null, 2)}

---

OUTPUT FORMAT (STRICT JSON):

Return a complete resume data structure in this exact format:

{
  "personalDetails": {
    "fullName": string,
    "email": string,
    "phone": string,
    "linkedin": string,
    "github": string,
    "website": string,
    "location": string
  },
  "jobTitle": string,
  "objective": string,
  "workExperience": [
    {
      "jobTitle": string,
      "companyName": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "description": string
    }
  ],
  "education": [
    {
      "degree": string,
      "institution": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "description": string
    }
  ],
  "skills": [
    {
      "category": string,
      "skills": string
    }
  ],
  "projects": [
    {
      "projectName": string,
      "description": string,
      "link": string
    }
  ],
  "certifications": [
    {
      "certificationName": string,
      "issuingOrganization": string,
      "issueDate": string
    }
  ],
  "languages": [
    {
      "language": string,
      "proficiency": string
    }
  ],
  "customSections": [
    {
      "sectionTitle": string,
      "content": string
    }
  ]
}

---

OPTIMIZATION GUIDELINES:

1. **Work Experience**:
   - Start each bullet with strong action verbs (Led, Developed, Implemented, Achieved, etc.)
   - Include quantifiable metrics where possible (%, numbers, scale)
   - Incorporate improved text from suggestions
   - Naturally integrate missing keywords into descriptions where they fit

2. **Skills Section**:
   - Organize skills into logical categories
   - Prioritize job-relevant skills at the top
   - Include all missing keywords that the candidate could reasonably have
   - Use exact terminology from job description

3. **Professional Summary/Objective**:
   - Highlight most relevant experience and skills
   - Include 3-5 key keywords from job description
   - Keep to 2-3 impactful sentences
   - Align with target role

4. **Projects** (if applicable):
   - Emphasize projects relevant to the job
   - Include technical keywords and technologies
   - Highlight outcomes and impact

5. **Education**:
   - Include relevant coursework if it matches job requirements
   - Add academic achievements if strong (Dean's List, honors, etc.)

6. **Additional Sections**:
   - Add certifications if mentioned in original resume
   - Include languages if relevant to the job
   - Create custom sections for awards, publications, volunteer work if present

---

IMPORTANT RULES:

- Return ONLY valid JSON, no additional text or markdown
- All fields must be present (use empty string "" or empty array [] if no data)
- Do not invent experiences, companies, or qualifications
- Apply improvements from suggestions accurately
- Ensure all dates are in consistent format
- Keep descriptions concise but impactful (3-5 bullets per job)
- Integrate missing keywords naturally, don't force them
- Maintain chronological order (most recent first)
- Ensure the optimized resume would score significantly higher on ATS analysis

---

Generate the optimized resume JSON now:`;

  const response = await openRouterQueue.add(() =>
    fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://resume-optimizer.com',
          'X-Title': 'Resume Optimizer',
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 4096,
        }),
      }
    )
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenRouter API error:", response.status, response.statusText, errorBody);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }

    if (response.status === 400) {
      throw new Error("Invalid request to OpenRouter API. Please check your input.");
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid OpenRouter API key or authentication failed.");
    }

    throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content received from OpenRouter API");
  }

  try {
    const result = JSON.parse(content);
    return result;
  } catch (parseError) {
    console.error("Failed to parse OpenRouter response as JSON:", content);
    throw new Error("OpenRouter API returned invalid JSON format");
  }
}
