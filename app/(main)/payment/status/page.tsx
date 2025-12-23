'use client';

import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Import toast logic handled by hook

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isVerifying, setIsVerifying] = useState(true); // Start true to trigger effect logic
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  // Derived state: pending if no data OR status is pending
  const isPending = !subscriptionData ||
    subscriptionData.cfStatus === 'BANK_APPROVAL_PENDING' ||
    subscriptionData.cfStatus === 'PENDING';

  const verifyAndFetch = async (isManual = false) => {
    // If manual, we always run. If auto (initial), we run.
    // We update isVerifying to show spinner if needed.
    setIsVerifying(true);
    setError(null);

    try {
      const orderId = searchParams.get('order_id');
      const cfSubscriptionId = searchParams.get('cf_subscriptionId');
      const cfStatus = searchParams.get('cf_status');
      const cfCheckoutStatus = searchParams.get('cf_checkoutStatus');

      // 1. One-time Order Flow (Credits)
      if (orderId) {
        const verifyUrl = '/api/payment/verify-cashfree';
        // Auto: 10 retries (approx 20s). Manual: 1 retry.
        let retries = isManual ? 1 : 10;
        let successData = null;

        while (retries > 0) {
          try {
            const res = await fetch(verifyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId })
            });
            const data = await res.json();

            if (res.ok && (data.success || data.message === "Already completed")) {
              successData = data;
              break;
            }

            const s = data.status || '';
            if (s === 'FAILED' || s === 'USER_DROPPED') {
              throw new Error(data.error || 'Payment failed');
            }
            // Pending... continue
          } catch (inner) { console.warn(inner); }

          retries--;
          if (retries > 0 && !successData) await new Promise(r => setTimeout(r, 2000));
        }

        if (successData) {
          setSubscriptionData({
            cfStatus: "ACTIVE",
            cfSubscriptionId: orderId,
            isOrder: true,
            ...successData
          });
          toast({
            title: "Payment Successful",
            description: "Your credits have been added successfully.",
            className: "bg-green-600 text-white border-green-700"
          });
        } else {
          if (isManual) toast({ title: "Still Processing", description: "Payment is still pending. Please wait or check again." });
        }
        return;
      }

      // 2. Subscription Flow
      if (cfSubscriptionId || cfStatus || cfCheckoutStatus) {
        if (cfCheckoutStatus === 'FAILED') throw new Error('Payment failed. Please try again.');

        const queryString = searchParams.toString();
        const verifyUrl = `/api/payment/verify-signature?${queryString}`;
        const res = await fetch(verifyUrl);
        if (!res.ok) throw new Error('Signature verification failed');

        const data = await res.json();
        setSubscriptionData({
          cfSubscriptionId,
          cfStatus,
          ...data
        });

        if (data.subscriptionStatus === 'active') {
          toast({
            title: "Subscription Active",
            description: "Your Pro plan is now active!",
            className: "bg-green-600 text-white border-green-700"
          });
        }
        return;
      }

      // If no valid params, shows error
      throw new Error('Invalid access. Please complete payment through the pricing page.');

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    verifyAndFetch(false);
  }, []);

  const handleRefresh = () => verifyAndFetch(true);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Issue</h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleRefresh} disabled={isVerifying} className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                {isVerifying ? 'Checking...' : 'Check Again'}
              </button>
              <button onClick={() => router.push('/pricing')} className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Back to Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending / Success View
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-lg p-8">
        <div className="text-center">
          {isPending ? (
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isVerifying ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              ) : (
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isPending ? 'Payment Processing' : 'Payment Successful!'}
          </h1>

          <p className="text-gray-600 mb-6">
            {isPending
              ? 'We are checking your payment status. This usually takes just a few seconds.'
              : subscriptionData?.isOrder
                ? 'Your credits have been added successfully.'
                : 'Your subscription is now active!'}
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {subscriptionData?.isOrder ? 'Order ID' : 'Reference ID'}
              </span>
              <span className="text-sm font-mono font-medium text-gray-900 break-all">
                {subscriptionData?.cfSubscriptionId || searchParams.get('order_id') || searchParams.get('cf_subscriptionId')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPending
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
                }`}>
                {isPending ? 'Processing...' : 'Completed'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {isPending && (
              <button
                onClick={handleRefresh}
                disabled={isVerifying}
                className="w-full bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-sm disabled:opacity-70"
              >
                {isVerifying ? 'Checking...' : 'Check Status Again'}
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Analyze Now!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading payment status...</p>
        </div>
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
