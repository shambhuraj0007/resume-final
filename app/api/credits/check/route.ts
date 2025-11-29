import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { hasCredits } from '@/payment/creditService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Get user from session
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { requiredCredits = 1 } = await req.json();

    const userId = (user._id as any).toString();
    const hasSufficientCredits = await hasCredits(userId, requiredCredits);
    
    return NextResponse.json({
      hasCredits: hasSufficientCredits,
      requiredCredits,
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { error: 'Failed to check credits' },
      { status: 500 }
    );
  }
}
