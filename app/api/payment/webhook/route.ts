import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { addCredits } from '@/payment/creditService';
import Transaction from '@/models/Transaction';
import { RAZORPAY_CONFIG } from '@/payment/config';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find transaction
      const transaction = await Transaction.findOne({
        razorpayOrderId: orderId,
      });

      if (!transaction) {
        console.error('Transaction not found for order:', orderId);
        return NextResponse.json({ received: true });
      }

      // Skip if already processed
      if (transaction.status === 'completed') {
        return NextResponse.json({ received: true });
      }

      // Update transaction
      transaction.status = 'completed';
      transaction.razorpayPaymentId = paymentId;
      transaction.paymentId = paymentId;
      transaction.paymentMethod = payment.method;
      await transaction.save();

      // Add credits to user
      await addCredits(
        transaction.userId.toString(),
        transaction.credits,
        transaction.validityMonths
      );

      console.log('Credits added via webhook for transaction:', transaction._id);
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      const transaction = await Transaction.findOne({
        razorpayOrderId: orderId,
      });

      if (transaction) {
        transaction.status = 'failed';
        transaction.failureReason = payment.error_description || 'Payment failed';
        await transaction.save();
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
