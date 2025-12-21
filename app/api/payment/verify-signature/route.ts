import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function verifySignature(params: URLSearchParams, secretKey: string) {
  const signature = params.get('signature');
  if (!signature) {
    return false;
  }

  // Create sorted string of all params except signature
  const sortedParams = Array.from(params.entries())
    .filter(([key]) => key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const computedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('base64');

  return computedSignature === signature;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const params = new URLSearchParams(body.searchParams);
        const secretKey = process.env.CASHFREE_SECRET_KEY;

        if (!secretKey) {
            return NextResponse.json({ error: 'Cashfree secret key not configured' }, { status: 500 });
        }

        const isValid = verifySignature(params, secretKey);

        return NextResponse.json({ isValid });
    } catch (error: any) {
        console.error('Signature verification error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
