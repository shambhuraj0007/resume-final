import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find token
        const verificationToken = await VerificationToken.findOne({ token });

        if (!verificationToken) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 400 }
            );
        }

        // Check expiry
        if (verificationToken.expiresAt < new Date()) {
            await VerificationToken.deleteOne({ _id: verificationToken._id });
            return NextResponse.json(
                { error: 'Token has expired' },
                { status: 400 }
            );
        }

        // Find user
        const user = await User.findOne({ email: verificationToken.email });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user
        user.password = hashedPassword;
        user.emailVerified = new Date(); // Mark email as verified since they received the reset link
        user.isVerified = true; // Also update isVerified for consistency

        // Ensure provider is credentials if they are resetting password
        user.provider = 'credentials';

        await user.save();

        // Delete token
        await VerificationToken.deleteOne({ _id: verificationToken._id });

        return NextResponse.json(
            { message: 'Password reset successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again later.' },
            { status: 500 }
        );
    }
}
