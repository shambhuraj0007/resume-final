import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import { getUserCredits } from '@/payment/creditService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        {
          credits: 0,
          expiryDate: null,
          hasExpired: false,
          unauthenticated: true,
        },
        { status: 200 }
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

    const userId = (user._id as any).toString();
    const credit = await getUserCredits(userId);

    return NextResponse.json({
      credits: credit.credits,
      expiryDate: credit.expiryDate,
      hasExpired: credit.expiryDate ? new Date() > credit.expiryDate : false,
      subscriptionStatus: user.subscriptionStatus,
      isPro: user.subscriptionStatus === 'active',
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}
