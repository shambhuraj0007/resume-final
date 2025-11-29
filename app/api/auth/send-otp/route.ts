import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Validate Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifySid) {
  console.error('Missing Twilio configuration:', {
    accountSid: accountSid ? 'Set' : 'Missing',
    authToken: authToken ? 'Set' : 'Missing',
    verifySid: verifySid ? 'Set' : 'Missing'
  });
}

// Validate Account SID format
if (accountSid && !accountSid.startsWith('AC')) {
  console.error('Invalid TWILIO_ACCOUNT_SID format. It should start with "AC", got:', accountSid?.substring(0, 10) + '...');
}

let client: any = null;
try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    if (!client) {
      return NextResponse.json(
        { 
          error: 'Twilio not configured', 
          details: 'Please check your Twilio environment variables'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const phoneNumber = body.phoneNumber || body.phone;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber.replace(/\D/g, '')}`;

    // Send OTP using Twilio Verify
    const verification = await client.verify.v2
      .services(verifySid!)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms'
      });

    return NextResponse.json({
      success: true,
      status: verification.status,
      message: 'OTP sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending OTP:', error);

    if (error.code === 21608) {
      return NextResponse.json(
        {
          error: 'Cannot send SMS to this number on Twilio trial account',
          details: 'Twilio trial accounts can only send SMS to verified phone numbers. Please verify this phone number in your Twilio console or upgrade your Twilio account.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to send OTP',
        details: error.message
      },
      { status: 500 }
    );
  }
}
