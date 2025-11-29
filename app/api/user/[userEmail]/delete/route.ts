import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/Resume';

// DELETE - Delete user account and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userEmail: string } }
) {
  try {
    await connectDB();
    
    const { userEmail } = params;

    // Delete all user's resumes
    await Resume.deleteMany({ userEmail: userEmail.toLowerCase() });

    // Delete user account
    const user = await User.findOneAndDelete({ email: userEmail.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
