import { NextRequest, NextResponse } from "next/server";

/**
 * Cashfree Subscriptions often redirect back using a POST request.
 * Next.js Pages only support GET. This API route bridges the two.
 * It takes the callback (GET or POST) and redirects the user to /pricing
 * using a standard GET redirect (303 for POST).
 */
export async function POST(req: NextRequest) {
    try {
        const host = req.headers.get("host") || "localhost:8888";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

        const searchParams = req.nextUrl.searchParams.toString();
        // Force /pricing and preserve params
        const redirectUrl = new URL(`/pricing?${searchParams}`, baseUrl);

        console.log(`[SUCCESS_REDIRECT] POST Redirecting to: ${redirectUrl.toString()}`);
        return NextResponse.redirect(redirectUrl.toString(), 303); // 303 See Other is specifically for GET redirect after POST
    } catch (error) {
        console.error("Success Redirect Error (POST):", error);
        return NextResponse.redirect(new URL("/pricing", req.url).toString());
    }
}

export async function GET(req: NextRequest) {
    try {
        const host = req.headers.get("host") || "localhost:8888";
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`;

        const searchParams = req.nextUrl.searchParams.toString();
        const redirectUrl = new URL(`/pricing?${searchParams}`, baseUrl);

        console.log(`[SUCCESS_REDIRECT] GET Redirecting to: ${redirectUrl.toString()}`);
        return NextResponse.redirect(redirectUrl.toString());
    } catch (error) {
        console.error("Success Redirect Error (GET):", error);
        return NextResponse.redirect(new URL("/pricing", req.url).toString());
    }
}
