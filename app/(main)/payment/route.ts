import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('[PAYMENT ROUTE] Handling POST to /payment');
    
    // Read POST body
    const formData = await req.formData();
    const params = new URLSearchParams();
    
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });

    // Redirect to status page with params
    const redirectUrl = new URL(
      `/payment/status?${params.toString()}`,
      req.nextUrl.origin
    );

    console.log('[PAYMENT ROUTE] Redirecting to:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl, 303);
    
  } catch (error) {
    console.error('[PAYMENT ROUTE] Error:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
