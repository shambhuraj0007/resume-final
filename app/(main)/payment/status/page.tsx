'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Helper to add debug logs
  const addLog = (message: string) => {
    console.log(`[STATUS PAGE] ${message}`);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        addLog('=== PAGE LOADED ===');
        addLog(`Environment check: NEXTAUTH_URL = ${process.env.NEXT_PUBLIC_APP_URL || 'undefined'}`);
        
        // Log all search params
        const allParams = Array.from(searchParams.entries());
        addLog(`Total params received: ${allParams.length}`);
        allParams.forEach(([key, value]) => {
          addLog(`  - ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        });

        // Get Cashfree parameters
        const cfSubscriptionId = searchParams.get('cf_subscriptionId');
        const cfStatus = searchParams.get('cf_status');
        const cfCheckoutStatus = searchParams.get('cf_checkoutStatus');
        const signature = searchParams.get('signature');

        addLog(`cfSubscriptionId: ${cfSubscriptionId || 'NULL'}`);
        addLog(`cfStatus: ${cfStatus || 'NULL'}`);
        addLog(`cfCheckoutStatus: ${cfCheckoutStatus || 'NULL'}`);
        addLog(`signature present: ${signature ? 'YES' : 'NO'}`);

        // Check if this is direct access or missing params
        if (!cfSubscriptionId && !cfStatus && !cfCheckoutStatus) {
          addLog('ERROR: No Cashfree parameters detected - likely direct access');
          setError('Invalid access. Please complete payment through the pricing page.');
          setLoading(false);
          return;
        }

        // Build query string for verification
        const queryString = searchParams.toString();
        addLog(`Query string length: ${queryString.length}`);
        
        if (!queryString) {
          addLog('ERROR: Query string is empty');
          setError('No payment data received');
          setLoading(false);
          return;
        }

        // Check if checkout failed immediately
        if (cfCheckoutStatus === 'FAILED') {
          addLog('Payment marked as FAILED by Cashfree');
          setError('Payment failed. Please try again.');
          setLoading(false);
          return;
        }

        // Attempt signature verification
        addLog('Attempting signature verification...');
        const verifyUrl = `/api/payment/verify-signature?${queryString}`;
        addLog(`Verify URL: ${verifyUrl.substring(0, 100)}...`);

        let verifyResponse;
        try {
          verifyResponse = await fetch(verifyUrl);
          addLog(`Verify response status: ${verifyResponse.status} ${verifyResponse.statusText}`);
        } catch (fetchError) {
          addLog(`FETCH ERROR: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
          throw new Error('Network error during verification');
        }

        if (!verifyResponse.ok) {
          let errorData;
          try {
            errorData = await verifyResponse.json();
            addLog(`Verify error data: ${JSON.stringify(errorData)}`);
          } catch (parseError) {
            addLog('Could not parse error response');
            errorData = { error: 'Unknown verification error' };
          }
          throw new Error(errorData.error || 'Signature verification failed');
        }

        // Parse verification response
        let verifyData;
        try {
          verifyData = await verifyResponse.json();
          addLog(`Verify success: ${JSON.stringify(verifyData)}`);
        } catch (parseError) {
          addLog(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
          throw new Error('Invalid verification response');
        }

        // Set subscription data
        const finalData = {
          cfSubscriptionId,
          cfStatus,
          cfCheckoutStatus,
          ...verifyData
        };
        addLog(`Final subscription data: ${JSON.stringify(finalData)}`);
        setSubscriptionData(finalData);

        addLog('=== VERIFICATION COMPLETE ===');
        setLoading(false);

      } catch (err) {
        addLog(`CAUGHT ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
        addLog(`Error stack: ${err instanceof Error ? err.stack : 'No stack'}`);
        console.error('Status page error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [searchParams]);

  // Debug panel (only show in development)
  const DebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black text-green-400 p-4 max-h-64 overflow-y-auto text-xs font-mono">
        <div className="flex justify-between items-center mb-2">
          <strong>🐛 DEBUG CONSOLE</strong>
          <button 
            onClick={() => setDebugLogs([])}
            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
          >
            Clear
          </button>
        </div>
        {debugLogs.map((log, i) => (
          <div key={i} className="border-l-2 border-green-600 pl-2 mb-1">
            {log}
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your payment...</p>
            <p className="mt-2 text-sm text-gray-400">Check console for debug info</p>
          </div>
        </div>
        <DebugPanel />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="text-red-600 text-5xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Payment Error</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              
              {/* Show debug info in error state */}
              <div className="bg-gray-100 rounded p-4 mb-6 text-left">
                <p className="font-semibold mb-2">Debug Information:</p>
                <div className="text-xs space-y-1">
                  <p>• URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                  <p>• Params count: {Array.from(searchParams.entries()).length}</p>
                  <p>• Logs: {debugLogs.length} entries (check browser console)</p>
                </div>
              </div>

              <button
                onClick={() => {
                  addLog('User clicked: Back to Pricing');
                  router.push('/pricing');
                }}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Back to Pricing
              </button>
            </div>
          </div>
        </div>
        <DebugPanel />
      </>
    );
  }

  // Success state
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {subscriptionData?.cfCheckoutStatus === 'SUCCESS' 
                ? 'Payment Successful!' 
                : 'Subscription Activated!'}
            </h1>
            
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subscription ID:</span>
                <span className="font-mono text-sm">{subscriptionData?.cfSubscriptionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold text-green-600">{subscriptionData?.cfStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Checkout Status:</span>
                <span className="font-semibold">{subscriptionData?.cfCheckoutStatus}</span>
              </div>
            </div>

            {/* Debug info in success state */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left bg-blue-50 rounded p-4 mb-6">
                <summary className="cursor-pointer font-semibold text-blue-900">
                  🔍 Debug Data
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(subscriptionData, null, 2)}
                </pre>
              </details>
            )}

            <button
              onClick={() => {
                addLog('User clicked: Go to Dashboard');
                router.push('/');
              }}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
      <DebugPanel />
    </>
  );
}

export default function PaymentStatusPage() {
  console.log('[STATUS PAGE] Main component rendering');
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading payment status...</p>
        </div>
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
