import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export interface AuthUser {
  userId: string;
  phone: string;
  name: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const decoded = verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthUser;

    // Optionally verify user still exists in database
    await connectDB();
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return null;
    }

    return decoded;

  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await verifyAuth(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}
