'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PaymentStatus() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const cfSubscriptionId = searchParams.get('cf_subscriptionId');
    const cfStatus = searchParams.get('cf_status');
    const cfCheckoutStatus = searchParams.get('cf_checkoutStatus');
    const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');

    useEffect(() => {
        const verifyStatus = async () => {
            try {
                const searchParamsString = window.location.search;
                const params = new URLSearchParams(searchParamsString);

                // Verify signature first
                const sigRes = await fetch('/api/payment/verify-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ searchParams: searchParamsString }),
                });

                const sigData = await sigRes.json();

                if (!sigData.isValid) {
                    setStatus('error');
                    return;
                }

                if (cfSubscriptionId) {
                    const res = await fetch(`/api/payment/verify-subscription?subscription_id=${cfSubscriptionId}`);
                    const data = await res.json();
                    handleStatusResponse(data);
                } else {
                    // Fallback or error handling if cf_subscriptionId is not present
                    const res = await fetch('/api/user/status');
                    const data = await res.json();
                    if (data.subscriptionStatus === 'active') {
                        setStatus('success');
                    } else {
                        setStatus('pending');
                    }
                }
            } catch (error) {
                console.error('Status verification error:', error);
                setStatus('error');
            }
        };

        const handleStatusResponse = (data: any) => {
            const subStatus = data.status || data.subscription_status || cfStatus;
            if (subStatus === 'ACTIVE' || subStatus === 'ACTIVATED' || subStatus === 'SUCCESS' || subStatus === 'active') {
                setStatus('success');
            } else if (subStatus === 'PENDING' || subStatus === 'INITIALIZED' || subStatus === 'BANK_APPROVAL_PENDING') {
                setStatus('pending');
            } else {
                setStatus('error');
            }
        };

        if (searchParams.toString()) { // Only run if there are query params
            verifyStatus();
        }
    }, [cfSubscriptionId, cfStatus, searchParams]);

    const handleDashboard = () => router.push('/dashboard');
    const handleSupport = () => window.location.href = 'mailto:support@shortlistai.com';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center border border-slate-200 dark:border-slate-800"
            >
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verifying Payment...</h2>
                        <p className="text-slate-500">Please wait while we confirm your subscription.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Subscription Active!</h2>
                        <p className="text-slate-500 mb-8">Welcome to Pro. Your account has been upgraded successfully.</p>
                        <Button onClick={handleDashboard} className="w-full h-12 rounded-full font-bold bg-green-600 hover:bg-green-700 text-white">
                            Go to Dashboard
                        </Button>
                    </div>
                )}

                {status === 'pending' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
                            <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Pending</h2>
                        <p className="text-slate-500 mb-8">We've received your request. Your subscription will be active once bank authorization is complete.</p>
                        <Button onClick={handleDashboard} variant="outline" className="w-full h-12 rounded-full font-bold">
                            Return to Dashboard
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Failed</h2>
                        <p className="text-slate-500 mb-8">We couldn't verify your subscription. Please try again or contact support.</p>
                        <div className="flex flex-col gap-3 w-full">
                            <Button onClick={() => router.push('/pricing')} className="w-full h-12 rounded-full font-bold">
                                Try Again
                            </Button>
                            <Button onClick={handleSupport} variant="ghost" className="w-full">
                                Contact Support
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
