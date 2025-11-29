import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// GET - Fetch user settings
export async function GET(
  request: NextRequest,
  { params }: { params: { userEmail: string } }
) {
  try {
    await connectDB();
    
    const { userEmail } = params;
    let user = await User.findOne({ email: userEmail.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: user.settings,
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update user settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { userEmail: string } }
) {
  try {
    await connectDB();
    
    const { userEmail } = params;
    const body = await request.json();
    const { settings, name, password } = body;

    const update: any = { settings };
    if (typeof name === 'string' && name.trim().length > 0) {
      update.name = name.trim();
      update['settings.displayName'] = settings?.displayName ?? name.trim();
    }
    if (typeof password === 'string' && password.length >= 8) {
      const hashed = await bcrypt.hash(password, 10);
      update.password = hashed;
    }

    const user = await User.findOneAndUpdate(
      { email: userEmail.toLowerCase() },
      update,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
