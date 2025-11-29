import Razorpay from 'razorpay';
import crypto from 'crypto';
import { RAZORPAY_CONFIG } from './config';

// Initialize Razorpay instance
export const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_CONFIG.keyId,
  key_secret: RAZORPAY_CONFIG.keySecret,
});

// Create Razorpay order
export async function createRazorpayOrder(amount: number, currency: string = 'INR', receipt: string) {
  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

// Verify Razorpay payment signature
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.keySecret)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Fetch payment details
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
}

// Refund payment
export async function refundPayment(paymentId: string, amount?: number) {
  try {
    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: amount ? amount * 100 : undefined, // Amount in paise
    });
    return refund;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
}
