import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ResumeCounter from '@/models/ResumeCounter';

export async function GET() {
  try {
    await connectDB();
    
    let counter = await ResumeCounter.findOne();
    
    if (!counter) {
      counter = await ResumeCounter.create({ count: 0 });
    }

    return NextResponse.json({ count: counter.count });
  } catch (error) {
    console.error('Error fetching resume count:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
