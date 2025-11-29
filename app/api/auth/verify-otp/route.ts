import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sign } from 'jsonwebtoken';

// Validate Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

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
    const { otp, name, password } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber.replace(/\D/g, '')}`;

    // Verify OTP using Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(verifySid!)
      .verificationChecks.create({
        to: formattedPhone,
        code: otp
      });

    if (verificationCheck.status !== 'approved') {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user exists
    let user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        phone: formattedPhone,
        name: name || 'User',
        email: `${formattedPhone.replace('+', '')}@gmail.com`,
        isVerified: true,
        emailVerified: new Date(),
        provider: 'phone',
        credits: 5
      });
      if (password && typeof password === 'string' && password.length >= 8) {
        const bcrypt = (await import('bcryptjs')).default;
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
      }
      await user.save();
    } else {
      // Update existing user verification status
      user.isVerified = true;
      if (name && typeof name === 'string' && name.trim().length > 0) {
        user.name = name.trim();
      }
      if (!user.email) {
        user.email = `${formattedPhone.replace('+', '')}@gmail.com`;
      }
      if (!user.emailVerified) {
        user.emailVerified = new Date();
      }
      if (password && typeof password === 'string' && password.length >= 8) {
        const bcrypt = (await import('bcryptjs')).default;
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
      }
      await user.save();
    }

    // Create JWT token
    const token = sign(
      { 
        userId: user._id, 
        phone: user.phone,
        name: user.name 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        credits: user.credits,
        isVerified: user.isVerified
      },
      message: 'Phone number verified successfully'
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify OTP', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
