import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AnalysisHistory from '@/models/AnalysisHistory';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id;

    const totalAnalyses = await AnalysisHistory.countDocuments({ userId });

    return NextResponse.json({
      memberSince: user.createdAt,
      totalAnalyses,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}
