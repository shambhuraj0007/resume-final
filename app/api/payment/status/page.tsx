'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function PaymentStatusPage() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'verifying'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function verifyPayment() {
      try {
        console.log('[PAYMENT_STATUS] ═══════════════════════════════════');
        console.log('[PAYMENT_STATUS] All URL params:', Object.fromEntries(searchParams.entries()));
        console.log('[PAYMENT_STATUS] ═══════════════════════════════════');

        // Normalize params
        const orderId = searchParams.get('order_id');
        const cfSubscriptionId =
          searchParams.get('cf_subscriptionId') ||
          searchParams.get('cf_subscription_id') ||
          searchParams.get('subscription_id');
        const cfStatus =
          searchParams.get('cf_status') ||
          searchParams.get('subscription_status');
        const cfCheckoutStatus =
          searchParams.get('cf_checkoutStatus') ||
          searchParams.get('cf_checkout_status');

        console.log('[PAYMENT_STATUS] Normalized:', {
          orderId,
          cfSubscriptionId,
          cfStatus,
          cfCheckoutStatus,
        });

        // Check for failed payment
        if (cfCheckoutStatus === 'FAILED' || cfStatus === 'FAILED') {
          setStatus('failed');
          setErrorMessage('Payment failed. Please try again.');
          return;
        }

        // Check if this is a subscription
        const isSubscription = !!(
          cfSubscriptionId ||
          cfStatus ||
          cfCheckoutStatus ||
          searchParams.get('subscription_id') ||
          searchParams.get('cf_subscription_id')
        );

        console.log('[PAYMENT_STATUS] Is subscription?', isSubscription);

        if (isSubscription) {
          setStatus('verifying');
          
          // Call verify-signature with ALL params
          const queryString = searchParams.toString();
          const verifyUrl = `/api/payment/verify-signature?${queryString}`;
          
          console.log('[PAYMENT_STATUS] Calling verify-signature:', verifyUrl);

          const res = await fetch(verifyUrl, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });

          console.log('[PAYMENT_STATUS] Verify response status:', res.status);

          if (!res.ok) {
            const errorData = await res.json();
            console.error('[PAYMENT_STATUS] Verification failed:', errorData);
            throw new Error(errorData.error || 'Verification failed');
          }

          const data = await res.json();
          console.log('[PAYMENT_STATUS] Verification response:', data);

          if (data.subscriptionStatus === 'active' || data.creditsAdded) {
            setStatus('success');
            
            toast({
              title: "🎉 Subscription Activated!",
              description: `Your ${data.planName || 'Pro'} subscription is now active. Credits have been added to your account.`,
              className: "bg-green-600 text-white border-green-700",
            });

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push('/');
            }, 2000);
          } else {
            setStatus('failed');
            setErrorMessage('Payment is being processed. Please check back in a moment.');
          }
        } else {
          // Not a subscription, redirect to pricing
          console.log('[PAYMENT_STATUS] Not a subscription, redirecting to pricing');
          setTimeout(() => {
            router.push('/pricing');
          }, 1000);
        }
      } catch (error: any) {
        console.error('[PAYMENT_STATUS] Error:', error);
        setStatus('failed');
        setErrorMessage(error.message || 'An error occurred while verifying payment');
      }
    }

    verifyPayment();
  }, [mounted, searchParams, router, toast]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Processing Payment...
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Please wait while we receive payment confirmation from Cashfree.
              </p>
            </>
          )}

          {status === 'verifying' && (
            <>
              <div className="relative h-16 w-16 mx-auto mb-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                <CheckCircle className="h-8 w-8 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Verifying Subscription...
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Activating your subscription and adding credits.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Subscription Activated!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your subscription is now active and credits have been added to your account.
              </p>
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-slate-600">Redirecting to dashboard...</span>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Payment Issue
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/pricing')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Return to Pricing
                </Button>
                <Button
                  onClick={() => router.push('/profile')}
                  variant="outline"
                  className="w-full"
                >
                  Check Subscription Status
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Debug info in dev mode */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-lg text-xs overflow-auto">
            <div className="font-bold mb-2">Debug Info:</div>
            <pre>{JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
