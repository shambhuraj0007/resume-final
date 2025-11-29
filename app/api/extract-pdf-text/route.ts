import { NextRequest, NextResponse } from "next/server";
const pdfParse = require('pdf-parse');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Extract text from PDF
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Validate Resume
    const { isValidResume } = await import("@/lib/resume-validation");
    const validationResult = isValidResume(text, pdfData.numpages);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: validationResult.reason,
          details: validationResult.details
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error extracting PDF text:", error);

    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
