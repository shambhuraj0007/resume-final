import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendPasswordResetEmail } from '@/lib/email-service';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Return success even if user doesn't exist to prevent email enumeration
            return NextResponse.json(
                { message: 'If an account exists with this email, a password reset link has been sent.' },
                { status: 200 }
            );
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        // Save token (delete existing ones first)
        await VerificationToken.deleteMany({ email: user.email });
        await VerificationToken.create({
            email: user.email,
            token,
            expiresAt,
        });

        // Send email
        await sendPasswordResetEmail(user.email, token);

        return NextResponse.json(
            { message: 'If an account exists with this email, a password reset link has been sent.' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again later.' },
            { status: 500 }
        );
    }
}
