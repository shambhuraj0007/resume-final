import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';

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

    const { latexCode, filename } = await req.json();

    if (!latexCode) {
      return NextResponse.json(
        { error: "LaTeX code is required" },
        { status: 400 }
      );
    }

    // Use LaTeX.Online API for compilation
    // This is a free service that compiles LaTeX to PDF
    const pdfBuffer = await compileLatexToPDF(latexCode);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'Optimized Resume'}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error compiling LaTeX:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function compileLatexToPDF(latexCode: string): Promise<Buffer> {
  try {
    // Option 1: Use LaTeX.Online API (free, no API key needed)
    const response = await fetch('https://latexonline.cc/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: latexCode,
        command: 'pdflatex',
      }),
    });

    if (!response.ok) {
      // If LaTeX.Online fails, try alternative approach
      console.error('LaTeX.Online compilation failed:', response.status);
      throw new Error('LaTeX compilation failed. Please check your LaTeX code for errors.');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('Error in LaTeX compilation:', error);
    
    // Fallback: Try alternative LaTeX compilation service
    try {
      return await compileWithAlternativeService(latexCode);
    } catch (fallbackError) {
      console.error('Fallback compilation also failed:', fallbackError);
      throw new Error('Failed to compile LaTeX to PDF. Please ensure your LaTeX code is valid.');
    }
  }
}

async function compileWithAlternativeService(latexCode: string): Promise<Buffer> {
  // Alternative: Use texlive.net API
  const response = await fetch('https://texlive.net/cgi-bin/latexcgi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      filecontents: latexCode,
      filename: 'resume.tex',
      engine: 'pdflatex',
      return: 'pdf',
    }),
  });

  if (!response.ok) {
    throw new Error('Alternative LaTeX compilation service failed');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
