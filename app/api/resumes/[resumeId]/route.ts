import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';

// GET - Fetch a specific resume
export async function GET(
  request: NextRequest,
  { params }: { params: { resumeId: string } }
) {
  try {
    await connectDB();
    
    const { resumeId } = params;
    const resume = await Resume.findOne({ resumeId });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}

// PUT - Update a specific resume
export async function PUT(
  request: NextRequest,
  { params }: { params: { resumeId: string } }
) {
  try {
    await connectDB();
    
    const { resumeId } = params;
    const body = await request.json();

    const resume = await Resume.findOneAndUpdate(
      { resumeId },
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resume updated successfully',
      resume,
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific resume
export async function DELETE(
  request: NextRequest,
  { params }: { params: { resumeId: string } }
) {
  try {
    await connectDB();
    
    const { resumeId } = params;
    const resume = await Resume.findOneAndDelete({ resumeId });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}
