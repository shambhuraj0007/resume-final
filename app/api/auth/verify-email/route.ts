import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { initializeUserCredits } from '@/payment/creditService';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find verification token
    const verificationToken = await VerificationToken.findOne({ token });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ token });
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    // Find and update user
    const user = await User.findOne({ email: verificationToken.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Update user's email verification status
    user.emailVerified = new Date();
    await user.save();

    // Initialize credits for new user
    try {
      const userId = (user._id as any).toString();
      await initializeUserCredits(userId);
    } catch (error) {
      console.error('Error initializing user credits:', error);
      // Don't block verification if credit initialization fails
    }

    // Delete verification token
    await VerificationToken.deleteOne({ token });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}

// GET route for direct link verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const verificationToken = await VerificationToken.findOne({ token });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    if (verificationToken.expiresAt < new Date()) {
      await VerificationToken.deleteOne({ token });
      return NextResponse.json(
        { error: 'Verification token has expired' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: verificationToken.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    user.emailVerified = new Date();
    await user.save();

    // Initialize credits
    try {
      const userId = (user._id as any).toString();
      await initializeUserCredits(userId);
    } catch (error) {
      console.error('Error initializing user credits:', error);
    }

    await VerificationToken.deleteOne({ token });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
