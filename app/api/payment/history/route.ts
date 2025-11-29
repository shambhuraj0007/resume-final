import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user from session
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const status = searchParams.get('status'); // optional filter

    const query: any = { userId: user._id };
    if (status && ['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items: items.map((t: any) => ({
        _id: t._id,
        orderId: t.orderId,
        razorpayOrderId: t.razorpayOrderId,
        paymentId: t.paymentId || t.razorpayPaymentId,
        amount: t.amount,
        currency: t.currency,
        credits: t.credits,
        status: t.status,
        packageType: t.packageType,
        validityMonths: t.validityMonths,
        paymentMethod: t.paymentMethod || null,
        failureReason: t.failureReason || null,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
