import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyAuth } from '@/lib/auth'; // Add verifyAuth
import connectDB from '@/lib/mongodb';
import { getUserCredits } from '@/payment/creditService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    // Fallback to Phone/JWT if no NextAuth session
    if (!userEmail) {
      const phoneUser = await verifyAuth(req);
      if (phoneUser) {
        await connectDB();
        const User = (await import('@/models/User')).default;
        const userDoc = await User.findById(phoneUser.userId);
        userEmail = userDoc?.email;
      }
    }

    if (!userEmail) {
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

    // Get user from resolved email
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (user._id as any).toString();
    const credit = await getUserCredits(userId);

    // Calculate next reset date (30 days after last reset)
    const lastResetDate = credit.lastResetDate || credit.createdAt;
    const nextResetDate = new Date(new Date(lastResetDate).getTime() + 30 * 24 * 60 * 60 * 1000);

    return NextResponse.json({
      credits: credit.credits,
      expiryDate: credit.expiryDate,
      hasExpired: credit.expiryDate ? new Date() > credit.expiryDate : false,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlanName: user.subscriptionPlanName,
      isPaidUser: user.isPaidUser || false,
      isPro: user.subscriptionStatus === 'active' || user.isPaidUser === true,
      isSubscriber: user.subscriptionStatus === 'active',
      lastCreditReset: lastResetDate,
      nextCreditReset: nextResetDate,
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}
