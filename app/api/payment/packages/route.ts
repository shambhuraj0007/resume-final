import { NextResponse } from 'next/server';
import { CREDIT_PACKAGES } from '@/payment/config';

export async function GET() {
  try {
    // Convert packages object to array
    const packages = Object.values(CREDIT_PACKAGES);
    
    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
