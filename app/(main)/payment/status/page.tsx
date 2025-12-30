'use client';

import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [statusState, setStatusState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // Use ref to tracking attempts and prevent double execution in React Strict Mode
  const attemptsRef = useRef(0);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    // Prevent double verification
    if (isVerifyingRef.current) return;

    const orderId = searchParams.get('order_id');
    const cfSubscriptionId = searchParams.get('cf_subscriptionId'); // Legacy or accidental?

    if (!orderId) {
      setErrorDetails('Invalid access: Missing Order ID.');
      setStatusState('failed');
      return;
    }

    const verifyOrder = async () => {
      isVerifyingRef.current = true;
      setStatusState('verifying');

      const verifyUrl = '/api/payment/verify-cashfree';
      const maxRetries = 10;
      let retries = 0;

      while (retries < maxRetries) {
        try {
          console.log(`[VERIFY] Attempt ${retries + 1}/${maxRetries} for order ${orderId}`);

          const res = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
          });

          const data = await res.json();
          console.log('[VERIFY] Response:', data);

          if (res.ok && (data.success || data.message === "Already completed")) {
            setSuccessData(data);
            setStatusState('success');

            toast({
              title: "Payment Successful",
              description: "Your credits have been added successfully!",
              className: "bg-green-600 text-white border-green-700"
            });

            // Auto redirect after 3 seconds
            setTimeout(() => {
              router.push('/pricing?payment_completed=true');
            }, 3000);

            return; // Success!
          }

          const s = data.status || '';
          if (s === 'FAILED' || s === 'USER_DROPPED') {
            throw new Error(data.error || 'Payment failed or was cancelled.');
          }

          // If still pending, wait and retry
          retries++;
          if (retries < maxRetries) {
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
          }

        } catch (err: any) {
          console.warn('[VERIFY] Error during check:', err);
          // If it's a hard failure, stop.
          if (err.message && (err.message.includes('failed') || err.message.includes('cancelled'))) {
            setErrorDetails(err.message);
            setStatusState('failed');
            return;
          }
          // Otherwise, maybe network glitch, continue retrying
          retries++;
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // If loop finishes without success
      setErrorDetails('Payment verification timed out. Please contact support if money was deducted.');
      setStatusState('failed');
    };

    verifyOrder();

  }, [searchParams, router, toast]);

  if (statusState === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Failed</h1>
          <p className="text-gray-600 mb-8">{errorDetails || 'Something went wrong.'}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-gray-900 text-white px-6 py-3.5 rounded-xl hover:bg-gray-800 transition-all font-medium shadow-lg shadow-gray-200"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  // Verifying or Success (Success has delay before redirect, so show success UI)
  const isSuccess = statusState === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center transition-all duration-300">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-500 ${isSuccess ? 'bg-green-100' : 'bg-blue-50'}`}>
          {isSuccess ? (
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {isSuccess ? 'Payment Successful!' : 'Verifying Payment...'}
        </h1>

        <p className="text-gray-600 mb-8">
          {isSuccess
            ? 'Your credits have been added. Redirecting you shortly...'
            : 'Please wait while we confirm your transaction. Do not close this window.'}
        </p>

        {!isSuccess && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-progress-indeterminate"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
