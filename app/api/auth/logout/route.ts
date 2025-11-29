import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear the auth token cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Expire immediately
    });

    return response;

  } catch (error: any) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { 
        error: 'Failed to logout', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
