import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';
import ResumeCounter from '@/models/ResumeCounter';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, userEmail, resumeData } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Generate user-friendly resume ID with username and date
    const username = resumeData?.personalDetails?.fullName 
      ? resumeData.personalDetails.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
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

    // Create resume document
    const resume = await Resume.create({
      userId,
      userEmail,
      resumeId,
      ...resumeData,
    });

    // Update resume counter
    await ResumeCounter.findOneAndUpdate(
      {},
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      resumeId: resume.resumeId,
      message: 'Resume created successfully',
    });
  } catch (error) {
    console.error('Error creating resume:', error);
    return NextResponse.json(
      { error: 'Failed to create resume' },
      { status: 500 }
    );
  }
}
