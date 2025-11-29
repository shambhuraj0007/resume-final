import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyAuth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);

    // Always connect to DB once before fetching user
    await connectDB();

    let user = null;

    if (authUser) {
      // Phone/JWT-based auth path
      user = await User.findById(authUser.userId).select('-password');
    } else {
      // Fallback to NextAuth session (Google / credentials)
      const session = await getServerSession(authOptions);

      if (!session || !session.user?.email) {
        return NextResponse.json(
          {
            success: false,
            user: null,
          },
          { status: 200 }
        );
      }

      user = await User.findOne({ email: String(session.user.email).toLowerCase() }).select('-password');
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        credits: user.credits,
        isVerified: user.isVerified,
        provider: user.provider
      }
    });

  } catch (error: any) {
    console.error('Error getting user info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get user info', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
