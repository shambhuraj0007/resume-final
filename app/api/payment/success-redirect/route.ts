import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("host") || "localhost:8888";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    const searchParams = req.nextUrl.searchParams;
    console.log(`[SUCCESS_REDIRECT] POST - All params:`, searchParams.toString());

    const redirectUrl = new URL(`/pricing?payment_completed=true`, baseUrl);

    console.log(`[SUCCESS_REDIRECT] Redirecting to: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (error) {
    console.error("Success Redirect Error (POST):", error);
    return NextResponse.redirect(new URL("/pricing?error=redirect_failed", req.url).toString());
  }
}

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("host") || "localhost:8888";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

    const searchParams = req.nextUrl.searchParams;
    console.log(`[SUCCESS_REDIRECT] GET - All params:`, searchParams.toString());

    const redirectUrl = new URL(`/pricing?payment_completed=true`, baseUrl);

    console.log(`[SUCCESS_REDIRECT] Redirecting to: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Success Redirect Error (GET):", error);
    return NextResponse.redirect(new URL("/pricing?error=redirect_failed", req.url).toString());
  }
}
