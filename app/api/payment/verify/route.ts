import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { verifyRazorpaySignature } from '@/payment/razorpay';
import { addCredits } from '@/payment/creditService';
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    // Verify signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find transaction
    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: user._id,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update transaction
    transaction.status = 'completed';
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paymentId = razorpay_payment_id;
    await transaction.save();

    // Add credits to user
    const userId = (user._id as any).toString();
    const credit = await addCredits(
      userId,
      transaction.credits,
      transaction.validityMonths
    );

    return NextResponse.json({
      success: true,
      credits: credit.credits,
      expiryDate: credit.expiryDate,
      message: 'Payment successful! Credits added to your account.',
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
