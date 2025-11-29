import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { openRouterQueue } from '@/lib/requestQueue';

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
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

    const { resumeText, suggestions, missingKeywords } = await req.json();

    if (!resumeText) {
      return NextResponse.json(
        { error: "Resume text is required" },
        { status: 400 }
      );
    }

    // Step 1: Convert resume to LaTeX
    const latexCode = await convertResumeToLatex(resumeText);

    // Step 2: Apply AI improvements to LaTeX
    const improvedLatex = await applyImprovementsToLatex(
      latexCode,
      resumeText,
      suggestions || [],
      missingKeywords || []
    );

    return NextResponse.json({
      originalLatex: latexCode,
      improvedLatex: improvedLatex,
    });

  } catch (error) {
    console.error("Error in LaTeX conversion:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function convertResumeToLatex(resumeText: string): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const prompt = `You are an expert LaTeX document converter specializing in resume/CV conversion.

Your task: Convert the provided resume text into clean, well-structured LaTeX code that preserves the original formatting, layout, and style as closely as possible.

---

REQUIREMENTS:

1. **Preserve Original Structure:**
   - Maintain the exact section order from the original resume
   - Keep the same heading hierarchy and organization
   - Preserve bullet points, lists, and formatting

2. **Use Modern LaTeX Packages:**
   - Use \\documentclass{article} or appropriate resume class
   - Include necessary packages: geometry, enumitem, hyperref, fontawesome5, etc.
   - Set appropriate margins and spacing

3. **Professional Formatting:**
   - Use clear section headers (\\section, \\subsection)
   - Implement proper spacing and alignment
   - Include contact information in header
   - Use itemize/enumerate for bullet points

4. **Preserve Content:**
   - Keep ALL text content exactly as provided
   - Maintain dates, company names, job titles
   - Preserve technical terms and keywords
   - Keep URLs and links

5. **LaTeX Best Practices:**
   - Escape special characters properly (%, &, $, #, etc.)
   - Use proper commands for formatting (\\textbf, \\textit, etc.)
   - Include proper document structure (preamble, begin/end document)
   - Make it compilable as-is

---

INPUT RESUME TEXT:
"""
${resumeText}
"""

---

OUTPUT FORMAT:

Return ONLY the complete LaTeX code, starting with \\documentclass and ending with \\end{document}.
Do not include any explanations, markdown formatting, or additional text.
The output should be directly compilable LaTeX code.

Example structure:
\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}

\\begin{document}

% Header with contact info
\\begin{center}
{\\Large \\textbf{Full Name}} \\\\
Email | Phone | Location \\\\
LinkedIn | GitHub
\\end{center}

\\section*{Professional Summary}
...

\\section*{Work Experience}
...

\\section*{Education}
...

\\section*{Skills}
...

\\end{document}

Generate the LaTeX code now:`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'https://resume-optimizer.com',
    'X-Title': 'Resume Optimizer',
  };

  const response = await openRouterQueue.add(() =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",  // Best for structured output like LaTeX
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,  // Lower temperature for more consistent LaTeX formatting
        max_tokens: 8192,
      }),
    })
  );

  // Handle rate limit errors
  if (response.status === 429) {
    const errorBody = await response.text();
    console.error("OpenRouter 429 Error (Rate Limit):", errorBody);
    throw new Error("API rate limit exceeded. Please try again later.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', response.status, response.statusText, errorBody);
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  let latexCode = data.choices[0].message.content;

  // Clean up the response - remove markdown code blocks if present
  latexCode = latexCode.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

  return latexCode;
}

async function applyImprovementsToLatex(
  latexCode: string,
  originalResumeText: string,
  suggestions: Suggestion[],
  missingKeywords: string[]
): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const prompt = `You are an expert LaTeX editor specializing in resume optimization for ATS (Applicant Tracking Systems).

Your task: Update the provided LaTeX resume code by applying specific improvements while maintaining the exact same formatting, structure, and layout.

---

CRITICAL REQUIREMENTS:

1. **Preserve Formatting:**
   - Keep the EXACT same LaTeX structure and commands
   - Maintain all spacing, margins, and layout
   - Do NOT change the document class or packages
   - Keep the same section order and hierarchy

2. **Apply Improvements:**
   - Replace original text with improved text from suggestions
   - Integrate missing keywords naturally into appropriate sections
   - Ensure all changes are seamless and professional
   - Maintain the same writing style and tone

3. **Content Updates:**
   - For each suggestion, find the originalText in the LaTeX and replace it with improvedText
   - Add missing keywords to relevant sections (skills, experience descriptions)
   - Keep all dates, company names, and factual information unchanged
   - Ensure proper LaTeX escaping for special characters

4. **Quality Standards:**
   - All text must remain professional and truthful
   - Keywords should fit naturally, not forced
   - Maintain consistent formatting throughout
   - Ensure the document remains compilable

---

ORIGINAL RESUME TEXT (for reference):
"""
${originalResumeText}
"""

---

CURRENT LATEX CODE:
"""
${latexCode}
"""

---

IMPROVEMENTS TO APPLY:

Suggestions:
${JSON.stringify(suggestions, null, 2)}

Missing Keywords to Integrate:
${JSON.stringify(missingKeywords, null, 2)}

---

INSTRUCTIONS:

1. For each suggestion:
   - Locate the originalText in the LaTeX code
   - Replace it with the improvedText
   - Maintain proper LaTeX formatting and escaping

2. For missing keywords:
   - Identify the most appropriate section (Skills, Experience, Summary)
   - Add them naturally without disrupting the flow
   - Use proper LaTeX formatting

3. Ensure the output:
   - Is valid, compilable LaTeX
   - Maintains the exact same visual structure
   - Includes all improvements
   - Has no syntax errors

---

OUTPUT FORMAT:

Return ONLY the complete updated LaTeX code.
Do not include explanations, markdown formatting, or additional text.
The output should be directly compilable LaTeX code.

Generate the improved LaTeX code now:`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_URL || 'https://resume-optimizer.com',
    'X-Title': 'Resume Optimizer',
  };

  const response = await openRouterQueue.add(() =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",  // Best for code/LaTeX editing
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,  // Low temperature for precise editing
        max_tokens: 8192,
      }),
    })
  );

  // Handle rate limit errors
  if (response.status === 429) {
    const errorBody = await response.text();
    console.error("OpenRouter 429 Error (Rate Limit):", errorBody);
    throw new Error("API rate limit exceeded. Please try again later.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter API error:', response.status, response.statusText, errorBody);
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  let improvedLatex = data.choices[0].message.content;

  // Clean up the response
  improvedLatex = improvedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

  return improvedLatex;
}
