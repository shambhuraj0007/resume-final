import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET user settings
export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== params.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    let user = await User.findOne({ email: params.email });
    
    if (!user) {
      // Create default settings if user doesn't exist
      user = await User.create({
        email: params.email,
        name: session.user.name || '',
        image: session.user.image,
        settings: {
          displayName: '',
          defaultTemplate: 'modern',
        },
      });
    }

    return NextResponse.json(user.settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT/UPDATE user settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== params.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const user = await User.findOneAndUpdate(
      { email: params.email },
      { 
        $set: { 
          settings: body,
          name: session.user.name || '',
          image: session.user.image,
        } 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json(user.settings);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
