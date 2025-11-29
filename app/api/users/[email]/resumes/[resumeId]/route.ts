import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import Resume from '@/models/Resume';

// GET a specific resume
export async function GET(
  request: NextRequest,
  { params }: { params: { email: string; resumeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== params.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const resume = await Resume.findOne({
      userEmail: params.email,
      resumeId: params.resumeId,
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
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

// PUT/UPDATE a specific resume
export async function PUT(
  request: NextRequest,
  { params }: { params: { email: string; resumeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== params.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const resume = await Resume.findOneAndUpdate(
      {
        userEmail: params.email,
        resumeId: params.resumeId,
      },
      { $set: body },
      { new: true }
    );

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('Error updating resume:', error);
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    );
  }
}

// DELETE a specific resume
export async function DELETE(
  request: NextRequest,
  { params }: { params: { email: string; resumeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== params.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const resume = await Resume.findOneAndDelete({
      userEmail: params.email,
      resumeId: params.resumeId,
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}
