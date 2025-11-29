import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import AnalysisResult from '@/models/AnalysisResult';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const userId = (user._id as any).toString();
    
    // Fetch analysis history
    const analyses = await AnalysisResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count
    const total = await AnalysisResult.countDocuments({ userId });
    
    return NextResponse.json({ 
      analyses,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis history' },
      { status: 500 }
    );
  }
}
