
import { NextResponse } from "next/server";
import { validateResumeText } from "@/lib/documentValidators";

export async function POST(req: Request) {
    try {
        const { text } = await req.json();
        const result = validateResumeText(text || "");

        if (!result.isValid) {
            return NextResponse.json({ ok: false, ...result }, { status: 400 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            { ok: false, reason: "Internal server error during validation" },
            { status: 500 }
        );
    }
}
