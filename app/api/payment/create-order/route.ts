import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { createRazorpayOrder } from '@/payment/razorpay';
import { CREDIT_PACKAGES, PackageType } from '@/payment/config';
import Transaction from '@/models/Transaction';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    // Get user from session
    const User = (await import('@/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { packageType } = await req.json();

    if (!packageType || !(packageType in CREDIT_PACKAGES)) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    const selectedPackage = CREDIT_PACKAGES[packageType as PackageType];
    
    // Generate unique order ID (max 40 chars for Razorpay)
    // Format: ord_timestamp_random (e.g., ord_1735123456_abc123)
    const timestamp = Date.now().toString().slice(-10); // Last 10 digits
    const random = Math.random().toString(36).substring(2, 8); // 6 random chars
    const orderId = `ord_${timestamp}_${random}`; // Total: ~23 chars
    
    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(
      selectedPackage.price,
      selectedPackage.currency,
      orderId
    );

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
      status: 'pending',
      packageType,
      validityMonths: selectedPackage.validityMonths,
    });
    await transaction.save();

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
