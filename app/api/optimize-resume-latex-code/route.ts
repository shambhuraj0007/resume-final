import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { openRouterQueue } from '@/lib/requestQueue';

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
}

/**
 * This endpoint returns the optimized LaTeX code instead of compiling it.
 * Useful when LaTeX compilation services are unavailable.
 */
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
    console.log('Converting resume to LaTeX...');
    const latexCode = await convertResumeToLatex(resumeText);

    // Step 2: Apply AI improvements to LaTeX
    console.log('Applying improvements to LaTeX...');
    const improvedLatex = await applyImprovementsToLatex(
      latexCode,
      resumeText,
      suggestions || [],
      missingKeywords || []
    );

    // Return LaTeX code as downloadable .tex file
    return new NextResponse(improvedLatex, {
      headers: {
        'Content-Type': 'application/x-tex',
        'Content-Disposition': 'attachment; filename="optimized-resume.tex"',
      },
    });

  } catch (error) {
    console.error("Error generating LaTeX code:", error);

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

Convert the provided resume text into clean, well-structured LaTeX code that preserves the original formatting and layout.

REQUIREMENTS:
1. Use \\documentclass[11pt,a4paper]{article}
2. Include packages: geometry, enumitem, hyperref, xcolor
3. Set margins to 0.75in
4. Use \\section* for section headers (no numbering)
5. Use itemize with [leftmargin=*,label=\\textbullet] for bullets
6. Properly escape LaTeX special characters: \\%, \\&, \\$, \\#, \\_
7. Make it compilable with pdflatex

INPUT RESUME:
"""
${resumeText}
"""

TEMPLATE:
\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage[T1]{fontenc}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}

\\begin{document}

\\begin{center}
{\\Large \\textbf{FULL NAME}} \\\\
\\vspace{0.2em}
Email $|$ Phone $|$ Location \\\\
LinkedIn $|$ GitHub
\\end{center}

\\vspace{0.5em}

\\section*{PROFESSIONAL SUMMARY}
Summary text...

\\section*{WORK EXPERIENCE}
\\textbf{Job Title} \\hfill \\textit{Start -- End} \\\\
\\textbf{Company} \\hfill Location
\\begin{itemize}[leftmargin=*,label=\\textbullet,itemsep=0pt]
    \\item Achievement
\\end{itemize}

\\section*{EDUCATION}
\\textbf{Degree} \\hfill \\textit{Start -- End} \\\\
Institution \\hfill Location

\\section*{SKILLS}
\\textbf{Category:} Skill1, Skill2, Skill3

\\end{document}

Return ONLY the LaTeX code. No explanations.`;

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
          temperature: 0.3,
          max_tokens: 2048,
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

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid OpenRouter API key or authentication failed.");
    }

    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  let latexCode = data.choices?.[0]?.message?.content;

  if (!latexCode) {
    throw new Error("No LaTeX code received from OpenRouter API");
  }

  // Clean up markdown code blocks if present
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

  const prompt = `Update the LaTeX resume code by applying improvements while maintaining EXACT formatting.

RULES:
1. Keep ALL LaTeX structure identical
2. Replace original text with improved text from suggestions
3. Add missing keywords naturally
4. Properly escape LaTeX special characters
5. Ensure compilable output

CURRENT LATEX:
"""
${latexCode}
"""

IMPROVEMENTS:
Suggestions: ${JSON.stringify(suggestions.slice(0, 15), null, 2)}
Keywords: ${JSON.stringify(missingKeywords.slice(0, 10), null, 2)}

Return ONLY the updated LaTeX code.`;

  const response = await fetch(
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
        temperature: 0.3,
        max_tokens: 2048,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenRouter API error:", response.status, response.statusText, errorBody);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid OpenRouter API key or authentication failed.");
    }

    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  let improvedLatex = data.choices?.[0]?.message?.content;

  if (!improvedLatex) {
    throw new Error("No improved LaTeX code received from OpenRouter API");
  }

  // Clean up markdown code blocks if present
  improvedLatex = improvedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();

  return improvedLatex;
}
