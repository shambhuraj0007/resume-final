'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Region = "INDIA" | "USA" | "EUROPE" | "UK";

export default function PricingPage() {
  const [mounted, setMounted] = useState(false);
  const [pricingData, setPricingData] = useState<any>(null);
  const [region, setRegion] = useState<Region>("USA");
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const { isAuthenticated } = useAuth();
  const { refreshBalance } = useCredits();

  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);

  const cleanPackageName = (name: string) => {
    if (!name) return "";
    return name.replace(/\s*pack$/i, "").trim();
  };

  // ========== MOUNT CHECK ==========
  useEffect(() => {
    setMounted(true);
  }, []);

  // ========== CLEANUP ON UNMOUNT ==========
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // ========== SUBSCRIPTION STATUS POLLING ==========
  const pollSubscriptionStatus = useCallback(() => {
    if (isPollingStatus) {
      console.log('[POLL] Already polling, skipping');
      return;
    }

    console.log('[POLL] 🔄 Starting subscription status polling');
    setIsPollingStatus(true);
    pollAttemptsRef.current = 0;

    const maxAttempts = 15;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollAttemptsRef.current++;
        console.log(`[POLL] 🔍 Attempt ${pollAttemptsRef.current}/${maxAttempts}`);

        const response = await fetch('/api/user/status');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[POLL] 📊 Status:', data);

        if (data.subscriptionStatus === 'active' && data.isPaidUser) {
          console.log('[POLL] ✅ Subscription activated!');

          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPollingStatus(false);

          toast({
            title: "🎉 Subscription Activated!",
            description: `Welcome to ${data.subscriptionPlanName || 'Pro'}! Your credits have been added.`,
            className: "bg-green-600 text-white border-green-700",
          });

          try {
            await refreshBalance();
          } catch (e) {
            console.error('[POLL] Error refreshing balance:', e);
          }

          setTimeout(() => {
            console.log('[POLL] 🏠 Redirecting to home...');
            window.location.href = '/';
          }, 2000);

          return;
        }

        if (pollAttemptsRef.current >= maxAttempts) {
          console.log('[POLL] ⏱️ Max attempts reached');

          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPollingStatus(false);

          toast({
            title: "Processing Payment",
            description: "Your payment is taking longer than usual. Please refresh the page.",
          });
        }
      } catch (error: any) {
        console.error('[POLL] ❌ Error:', error.message);

        if (pollAttemptsRef.current >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPollingStatus(false);

          toast({
            title: "Error",
            description: "Failed to verify payment. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
    }, 2000);

  }, [isPollingStatus, toast, refreshBalance]);

  // ========== HANDLE PAYMENT COMPLETION ==========
  useEffect(() => {
    if (!mounted || (!session && !isAuthenticated)) {
      return;
    }

    const paymentInitiated = searchParams.get('payment_initiated');
    const paymentCompleted = searchParams.get('payment_completed');

    if (paymentInitiated === 'true' || paymentCompleted === 'true') {
      console.log('[PAYMENT] 💳 Payment completion detected');

      toast({
        title: "Processing Payment...",
        description: "Please wait while we verify your subscription.",
      });

      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('payment_initiated');
          url.searchParams.delete('payment_completed');
          window.history.replaceState({}, '', url.pathname);
          console.log('[PAYMENT] ✅ URL cleaned');
        } catch (error) {
          console.error('[PAYMENT] ❌ Error cleaning URL:', error);
        }
      }

      setTimeout(() => {
        pollSubscriptionStatus();
      }, 1000);
    }
  }, [mounted, searchParams, session, isAuthenticated, pollSubscriptionStatus, toast]);

  // ========== HANDLE SUCCESS/ERROR FROM VERIFY-SIGNATURE ==========
  useEffect(() => {
    if (!mounted) return;

    const success = searchParams.get('success');
    const plan = searchParams.get('plan');
    const credits = searchParams.get('credits');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (success === 'true') {
      console.log('[SUCCESS] ✅ Subscription activated');

      toast({
        title: "🎉 Subscription Activated!",
        description: `Welcome to ${plan || 'Pro'}! ${credits || '200'} credits added.`,
        className: "bg-green-600 text-white border-green-700",
      });

      refreshBalance();

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else if (error) {
      console.error('[ERROR] ❌ Subscription error:', error);

      toast({
        title: "Subscription Error",
        description: message || error.replace(/_/g, ' '),
        variant: "destructive",
      });

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            url.searchParams.delete('message');
            url.searchParams.delete('success');
            url.searchParams.delete('plan');
            url.searchParams.delete('credits');
            window.history.replaceState({}, '', url.pathname);
          } catch (e) {
            console.error('[ERROR] Failed to clean URL:', e);
          }
        }
      }, 3000);
    }
  }, [mounted, searchParams, toast, refreshBalance]);

  // ========== REGION DETECTION ==========
  useEffect(() => {
    if (!mounted) return;

    const testRegion = searchParams.get("test_region");
    if (testRegion) {
      setRegion(testRegion.toUpperCase() as Region);
    }
  }, [mounted, searchParams]);

  // ========== CLOSE DROPDOWN ON OUTSIDE CLICK ==========
  useEffect(() => {
    if (!mounted) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mounted]);

  // ========== FETCH PRICING ==========
  const fetchPricing = useCallback(
    async (regionToUse: Region) => {
      if (!mounted) return;

      setLoading(true);
      try {
        const testRegion = searchParams.get("test_region");
        const qs = testRegion
          ? `?test_region=${encodeURIComponent(testRegion)}`
          : `?region=${regionToUse}`;

        const response = await fetch(`/api/payment/packages${qs}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setPricingData(data);

        if (data.credit_packs && data.credit_packs.length > 0) {
          setSelectedPackId(data.credit_packs[0].id);
        }
      } catch (error: any) {
        console.error('[PRICING] ❌ Error:', error);
        toast({
          title: "Error",
          description: "Failed to load pricing.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [mounted, toast, searchParams]
  );

  useEffect(() => {
    if (mounted) {
      fetchPricing(region);
    }
  }, [mounted, fetchPricing, region]);

  // ========== HANDLERS ==========
  // handleSubscriptionCashfree removed

  const handlePackPurchase = async () => {
    if (!session && !isAuthenticated) {
      console.log('[PACK] User not authenticated');
      window.location.href = "/signin?callbackUrl=/pricing";
      return;
    }

    if (!selectedPackId) {
      toast({
        title: "Error",
        description: "Please select a package",
        variant: "destructive",
      });
      return;
    }

    setProcessingPackage(selectedPackId);
    try {
      console.log('[PACK] 🛒 Purchasing:', selectedPackId);

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selectedPackId, region }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      console.log('[PACK] ✅ Opening checkout');

      if (typeof window !== 'undefined' && (window as any).Cashfree) {
        const cashfree = (window as any).Cashfree({
          mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
        });

        cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_modal",
        });
      } else {
        throw new Error("Cashfree SDK not loaded");
      }
    } catch (error: any) {
      console.error('[PACK] ❌ Error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessingPackage(null);
    }
  };

  // ========== GUARD AGAINST SSR ==========
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[600px] rounded-[2rem] bg-white dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!pricingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Failed to load pricing</h2>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // ========== DERIVED DATA WITH NULL CHECKS ==========
  const isIndia = pricingData?.region === "INDIA";
  const selectedPack = pricingData?.credit_packs?.find((p: any) => p.id === selectedPackId) || pricingData?.credit_packs?.[0] || null;

  const freeFeatures = [
    "3 CV↔JD scans per month",
    "Realistic ATS match % and interview chance",
    "Skills matched & missing overview",
    "Watermarked optimized resume preview",
  ];

  const creditsFeatures = [
    "Full analysis for each scan",
    "All improvement suggestions unlocked",
    "Optimized resume PDF download",
    "Credits valid for 3 months",
    "No auto-renewal",
  ];

  const proFeatures = [
    "Unlimited CV↔JD scans",
    "Current & potential match %, interview chances",
    "All improvement suggestions (Text, Keywords, Other)",
    "Optimized resume PDF for every JD (unlimited downloads)",
    "*vs 50-pack @ ₹599",
    "History of recent scans & JDs",
    "Priority support",
  ];

  const CARD_MIN_H = "min-h-[640px]";
  const TITLE_H = "h-[48px] mb-2 flex items-center";
  const DESC_H = "h-[40px] mb-4";
  const SELECTION_AREA_H = "h-[88px] mb-2 flex items-end pb-2";
  const PRICE_AREA_H = "h-[60px] mb-6 flex items-start";

  // ========== JSX ==========
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16 pb-12 font-sans">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
        onLoad={() => console.log("✅ Cashfree SDK Loaded")}
        onError={() => console.error("❌ Failed to load Cashfree SDK")}
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Flexible, pay-as-you-go pricing
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-4">
          <PayPalScriptProvider
            key={pricingData?.currencyCode || "USD"}
            options={{
              clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
              intent: "subscription",
              vault: true,
              currency: pricingData?.currencyCode || "USD",
              "data-sdk-integration-source": "button-factory",
            }}
          >
            {/* FREE TIER CARD */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300`}
            >
              <div className={TITLE_H}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {pricingData?.free_tier?.title || "Free"}
                </h3>
              </div>
              <div className={DESC_H}>
                <p className="text-sm text-slate-500">
                  Try ShortlistAI with no commitment.
                </p>
              </div>

              <div className={SELECTION_AREA_H}>
                <div className="w-full">
                  <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                    Up to{" "}
                    <span className="font-bold text-slate-900 dark:text-white">
                      3 CV↔JD scans
                    </span>{" "}
                    per month
                  </p>
                </div>
              </div>

              <div className={PRICE_AREA_H}>
                <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                  {pricingData?.currency || "₹"}
                  {pricingData?.free_tier?.price ?? 0}
                </span>
              </div>

              <div>
                <Button
                  onClick={() => {
                    window.location.href = '/dashboard';
                  }}
                  className="w-full h-12 rounded-full text-base font-bold mb-8 bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm transition-all"
                >
                  Try Now
                </Button>
                <div className="mt-2 text-left">
                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                  <ul className="space-y-3">
                    {(pricingData?.free_tier?.features || freeFeatures).map(
                      (f: string) => (
                        <li
                          key={f}
                          className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <Check className="w-4 h-4 mt-0.5 text-green-500" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>


            {/* PAY-AS-YOU-GO CARD */}
            {pricingData?.credit_packs && pricingData.credit_packs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] border-amber-400 dark:border-amber-500/50 shadow-xl shadow-amber-500/5 transition-all duration-300`}
              >
                <div className={TITLE_H}>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Pay-as-you-go
                  </h3>
                </div>
                <div className={DESC_H}>
                  <p className="text-sm text-slate-500 mb-2">
                    Buy once, use within 3 months.
                  </p>
                </div>

                <div className={SELECTION_AREA_H}>
                  <div className="w-full relative group" ref={dropdownRef}>
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`
                        relative w-full rounded-xl py-3 pl-4 pr-12 cursor-pointer transition-all duration-300 ease-out
                        border backdrop-blur-sm
                        ${isDropdownOpen
                          ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
                          : "border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }
                      `}
                    >
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                        Select Pack
                      </span>
                      <span className="block text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                        {cleanPackageName(selectedPack?.name || "")}
                      </span>

                      <div
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform duration-300 ease-in-out"
                        style={{
                          transform: isDropdownOpen
                            ? "translateY(-50%) rotate(180deg)"
                            : "translateY(-50%) rotate(0deg)",
                        }}
                      >
                        <ChevronDown
                          className={`h-5 w-5 ${isDropdownOpen ? "text-blue-500" : ""
                            }`}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl shadow-slate-400/20 dark:shadow-black/50 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                          <div className="max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 py-2">
                            {pricingData.credit_packs.map((pack: any) => {
                              const isSelected = selectedPackId === pack.id;
                              return (
                                <div
                                  key={pack.id}
                                  onClick={() => {
                                    setSelectedPackId(pack.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`
                                    relative flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200
                                    border-l-2
                                    ${isSelected
                                      ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-600"
                                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                                    }
                                  `}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span
                                      className={`text-sm font-bold tracking-tight ${isSelected
                                        ? "text-blue-700 dark:text-blue-400"
                                        : "text-slate-700 dark:text-slate-200"
                                        }`}
                                    >
                                      {cleanPackageName(pack.name)}
                                    </span>
                                    <span
                                      className={`text-xs ${isSelected
                                        ? "text-blue-600/80 dark:text-blue-400/70"
                                        : "text-slate-400"
                                        }`}
                                    >
                                      {pricingData.currency}
                                      {pack.price}
                                    </span>
                                  </div>

                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="bg-blue-600 text-white rounded-full p-0.5"
                                    >
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className={PRICE_AREA_H}>
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                    {pricingData?.currency || "₹"}
                    {selectedPack?.price || 0}
                  </span>
                  <span className="text-sm text-slate-500 font-medium ml-1 mt-auto pb-1">
                    / one-time
                  </span>
                </div>

                <div>
                  {isIndia ? (
                    <Button
                      onClick={handlePackPurchase}
                      disabled={processingPackage !== null}
                      className="w-full h-12 rounded-full text-base font-bold mb-8 bg-[#1877F2] hover:bg-blue-600 text-white shadow-sm transition-all"
                    >
                      {processingPackage ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Buy Now"
                      )}
                    </Button>
                  ) : (
                    <div className="w-full mb-8">
                      <Button
                        disabled
                        className="w-full h-12 rounded-full text-base font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                      >
                        Coming Soon (PayPal)
                      </Button>
                    </div>
                  )}
                  <div className="mt-2 text-left">
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                    <ul className="space-y-3">
                      {creditsFeatures.slice(0, 5).map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <Check className="w-4 h-4 mt-0.5 text-blue-500" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUBSCRIPTIONS REMOVED AS PER REQUIREMENT */}
          </PayPalScriptProvider>
        </div>
      </section>
    </main>
  );
}
