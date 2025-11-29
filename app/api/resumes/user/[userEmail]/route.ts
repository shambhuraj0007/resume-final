import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';

// GET - Fetch all resumes for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userEmail: string } }
) {
  try {
    await connectDB();
    
    const { userEmail } = params;
    const resumes = await Resume.find({ userEmail })
      .sort({ updatedAt: -1 })
      .select('resumeId personalDetails createdAt updatedAt template');

    return NextResponse.json({
      success: true,
      resumes,
    });
  } catch (error) {
    console.error('Error fetching user resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}
