import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';

// GET all resumes for a user
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
    
    const resumes = await Resume.find({ userEmail: params.email })
      .sort({ createdAt: -1 })
      .select('resumeId personalDetails jobTitle createdAt updatedAt template');

    return NextResponse.json(resumes);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

// POST create a new resume
export async function POST(
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

    // Generate user-friendly resume ID with username and date
    const username = body?.personalDetails?.fullName 
      ? body.personalDetails.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      : 'user';
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS format
    let resumeId = `${username}_${dateStr}_${timeStr}`;
    
    // Ensure unique resumeId by checking if it already exists
    let counter = 1;
    let originalResumeId = resumeId;
    while (await Resume.findOne({ resumeId })) {
      resumeId = `${originalResumeId}_${counter}`;
      counter++;
    }
    
    const resume = await Resume.create({
      ...body,
      userId: session.user.id || params.email,
      userEmail: params.email,
      resumeId,
    });

    // Increment resume counter
    const ResumeCounter = (await import('@/models/ResumeCounter')).default;
    await ResumeCounter.findOneAndUpdate(
      {},
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ resumeId: resume.resumeId }, { status: 201 });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 }
    );
  }
}
