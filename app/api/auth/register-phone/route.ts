import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    const raw = String(phone);
    const digits = raw.replace(/\D/g, '');
    let e164 = '';
    if (raw.startsWith('+')) {
      e164 = raw;
    } else if (digits.length === 10) {
      e164 = `+91${digits}`;
    } else {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    

    await connectDB();
    const user = await User.findOne({ phone: e164 });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Verify OTP first.' },
        { status: 404 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.provider = 'phone';
    if (!user.email) {
      user.email = `${e164.replace('+', '')}@email.com`;
    }
    if (!user.emailVerified) {
      user.emailVerified = new Date();
    }
    await user.save();

    return NextResponse.json({ success: true, message: 'Phone account configured with password' });
  } catch (error: any) {
    console.error('Error registering phone user:', error);
    return NextResponse.json(
      { error: 'Failed to register phone user', details: error.message },
      { status: 500 }
    );
  }
}
