"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Region = "INDIA" | "USA" | "EUROPE" | "UK";

export default function PricingPage() {
  const [pricingData, setPricingData] = useState<any>(null);
  const [region, setRegion] = useState<Region>("USA");
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(
    null
  );

  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isAuthenticated } = useAuth();
  const { refreshBalance } = useCredits();

  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isVerifyingPending, setIsVerifyingPending] = useState(false);
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null);

  const cleanPackageName = (name: string) =>
    name.replace(/\s*pack$/i, "").trim();

  // ---------- Pending transaction check ----------

  const checkPending = useCallback(async () => {
    try {
      const res = await fetch("/api/payment/latest-pending");
      const data = await res.json();

      const urlOrderId = searchParams.get("order_id");
      if (urlOrderId) {
        setPendingOrder({ orderId: urlOrderId });
        setPendingStartedAt(Date.now());
        return;
      }

      const cfSubId =
        searchParams.get("cf_subscriptionId") ||
        searchParams.get("subscription_id");
      if (cfSubId) {
        setPendingOrder({ cfSubscriptionId: cfSubId, isSubscription: true });
        setPendingStartedAt(Date.now());
        return;
      }

      if (data.pending && data.transaction) {
        setPendingOrder(data.transaction);
        setPendingStartedAt(Date.now());
      }
    } catch (e) {
      console.error("Error checking pending:", e);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!session && !isAuthenticated) return;
    checkPending();
  }, [session, isAuthenticated, checkPending]);

  useEffect(() => {
    if (!pendingOrder || isVerifyingPending) return;

    const verifyPending = async () => {
      setIsVerifyingPending(true);
      const orderId = pendingOrder.orderId;
      const cfSubscriptionId = pendingOrder.cfSubscriptionId;
      const isSubscription =
        pendingOrder.isSubscription || !!cfSubscriptionId;

      let retries = isSubscription ? 1 : 20;

      while (retries > 0) {
        // IMPORTANT: If user clicked 'Hide' or timeout cleared the order, stop looping immediately
        if (!pendingOrder) break;

        try {
          const verifyUrl = isSubscription
            ? `/api/payment/verify-signature?${searchParams.toString()}`
            : "/api/payment/verify-cashfree";

          const res = await fetch(verifyUrl, {
            method: isSubscription ? "GET" : "POST",
            headers: { "Content-Type": "application/json" },
            ...(isSubscription ? {} : { body: JSON.stringify({ orderId }) }),
          });
          const data = await res.json();

          // If the status is 'ACTIVE', it means session is still live but not paid.
          // For subscriptions, we might only check once. For packs, we poll.
          if (
            res.ok &&
            (data.success ||
              data.message === "Already completed" ||
              data.subscriptionStatus === "active")
          ) {
            toast({
              title: "Payment Successful",
              description: "Credits added!",
              className: "bg-green-600 text-white border-green-700",
            });
            setPendingOrder(null);
            setPendingStartedAt(null);
            refreshBalance();

            setTimeout(() => {
              router.push("/");
            }, 2000);
            break;
          }

          const failureStatuses = [
            "FAILED",
            "USER_DROPPED",
            "CANCELLED",
            "EXPIRED",
            "VOIDED",
          ];
          if (
            failureStatuses.includes(data.status) ||
            data.cfCheckoutStatus === "FAILED"
          ) {
            setPendingOrder(null);
            setPendingStartedAt(null);
            toast({
              title: "Payment Not Completed",
              description:
                data.status === "USER_DROPPED"
                  ? "Payment was cancelled."
                  : "The transaction failed.",
              variant: "destructive",
            });
            break;
          }
        } catch (e) {
          console.warn("Verify poll error", e);
        }

        retries--;
        if (retries > 0 && pendingOrder) {
          await new Promise((r) => setTimeout(r, 2000));
        } else {
          // Only clear if we actually ran out of retries (and didn't break early)
          if (retries === 0) {
            setPendingOrder(null);
            setPendingStartedAt(null);
            toast({
              title: "Verification Timeout",
              description:
                "We're taking longer than usual to confirm. Please check your profile or email for confirmation.",
              variant: "default",
            });
          }
        }
      }
      setIsVerifyingPending(false);
    };

    verifyPending();
  }, [
    pendingOrder,
    searchParams,
    toast,
    refreshBalance,
    router,
    isVerifyingPending,
  ]);

  // ---------- Hard 30s timeout for pending banner ----------

  useEffect(() => {
    if (!pendingOrder || !pendingStartedAt) return;

    const timeoutMs = 30_000;
    const elapsed = Date.now() - pendingStartedAt;
    const remaining = timeoutMs - elapsed;

    if (remaining <= 0) {
      setPendingOrder(null);
      setPendingStartedAt(null);
      toast({
        title: "Payment Failed",
        description:
          "We could not confirm this payment. If money was deducted, please contact support.",
        variant: "destructive",
      });
      return;
    }

    const timer = setTimeout(() => {
      setPendingOrder(null);
      setPendingStartedAt(null);
      toast({
        title: "Payment Failed",
        description:
          "We could not confirm this payment. If money was deducted, please contact support.",
        variant: "destructive",
      });
    }, remaining);

    return () => clearTimeout(timer);
  }, [pendingOrder, pendingStartedAt, toast]);

  // ---------- Region detection (manual via ?test_region) ----------

  useEffect(() => {
    const testRegion = searchParams.get("test_region");
    if (testRegion) {
      setRegion(testRegion.toUpperCase() as Region);
    }
  }, [searchParams]);

  // ---------- Close dropdown on outside click ----------

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // ---------- Fetch pricing ----------

  const fetchPricing = useCallback(
    async (regionToUse: Region) => {
      setLoading(true);
      try {
        const testRegion = searchParams.get("test_region");
        const qs = testRegion
          ? `?test_region=${encodeURIComponent(testRegion)}`
          : `?region=${regionToUse}`;

        const response = await fetch(`/api/payment/packages${qs}`, {
          cache: "no-store",
        });
        const data = await response.json();
        setPricingData(data);

        if (data.credit_packs && data.credit_packs.length > 0) {
          setSelectedPackId(data.credit_packs[0].id);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load pricing.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, searchParams]
  );

  useEffect(() => {
    fetchPricing(region);
  }, [fetchPricing, region]);

  // ---------- Handlers ----------

  const openCashfreeCheckout = (sessionId: string) => {
    if (typeof window === "undefined" || !window.Cashfree) {
      console.error("Cashfree SDK not loaded");
      return;
    }

    const mode =
      process.env.NODE_ENV === "production" ? "production" : "sandbox";
    const cashfree = window.Cashfree({ mode });

    const checkoutOptions = {
      paymentSessionId: sessionId,
      redirectTarget: "_modal" as "_modal",
    };

    cashfree
      .checkout(checkoutOptions)
      .then(() => {
        setTimeout(() => {
          checkPending();
        }, 2000);
      })
      .catch((error: any) => {
        console.error("Checkout error:", error);
        toast({
          title: "Checkout Error",
          description: "Failed to open payment page.",
          variant: "destructive",
        });
      });
  };

  const handlePackPurchase = async () => {
    if (!session && !isAuthenticated)
      return router.push("/signin?callbackUrl=/pricing");
    if (!selectedPackId) return;

    setProcessingPackage(selectedPackId);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selectedPackId, region }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      openCashfreeCheckout(data.payment_session_id);
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingPackage(null);
    }
  };

  const handleSubscriptionCashfree = async (planKey: string) => {
    if (!session && !isAuthenticated)
      return router.push("/signin?callbackUrl=/pricing");

    try {
      const res = await fetch("/api/payment/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, region }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (!data.subscriptionSessionId) {
        throw new Error("No subscription session ID returned");
      }

      const cashfree = (window as any).Cashfree({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      cashfree
        .subscriptionsCheckout({
          subsSessionId: data.subscriptionSessionId,
          redirectTarget: "_self",
        })
        .then((result: any) => {
          if (result?.error) {
            console.error("Checkout error:", result.error);
            toast({
              title: "Checkout Failed",
              description:
                result.error.message || "Failed to open checkout",
              variant: "destructive",
            });
          }
        });
    } catch (error: any) {
      toast({
        title: "Subscription Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ---------- Loading / error ----------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[600px] rounded-[2rem] bg-white animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!pricingData)
    return <div className="p-8 text-center">Failed to load pricing</div>;

  // ---------- Derived data ----------

  const isIndia = pricingData.region === "INDIA";
  const selectedPack =
    pricingData.credit_packs?.find((p: any) => p.id === selectedPackId) ||
    pricingData.credit_packs?.[0];

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

  // ---------- JSX ----------

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16 pb-12 font-sans">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
        onLoad={() => console.log("Cashfree SDK Loaded")}
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
                  {pricingData.free_tier?.title || "Free"}
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
                  {pricingData.currency}
                  {pricingData.free_tier?.price ?? 0}
                </span>
              </div>

              <div>
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full h-12 rounded-full text-base font-bold mb-8 bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm transition-all"
                >
                  Try Now
                </Button>
                <div className="mt-2 text-left">
                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                  <ul className="space-y-3">
                    {(pricingData.free_tier?.features || freeFeatures).map(
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

            {/* PAY-AS-YOU-GO CARD, if packs exist */}
            {pricingData.credit_packs &&
              pricingData.credit_packs.length > 0 && (
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
                                const isSelected =
                                  selectedPackId === pack.id;
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
                      {pricingData.currency}
                      {selectedPack?.price}
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
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          "Buy Now"
                        )}
                      </Button>
                    ) : (
                      <div className="w-full mb-8 relative z-0 min-h-[52px]" style={{ colorScheme: "light" }}>
                        <Button
                          disabled
                          className="w-full h-12 rounded-full text-base font-bold mb-8 bg-slate-100 text-slate-400 cursor-not-allowed"
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

            {/* SUBSCRIPTIONS CARDS */}
            {pricingData.subscriptions.map((sub: any, idx: number) => {
              const isQuarterly = sub.id?.toLowerCase?.().includes("quarter");
              const isMonthly = !isQuarterly;
              const cta = isQuarterly
                ? "Subscribe"
                : "Subscribe";

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[3px] ${sub.id === "pro-monthly-inr" ||
                    sub.id === "pro-monthly-usd" ||
                    sub.id === "pro-monthly-eur" ||
                    sub.id === "pro-monthly-gbp"
                    ? "border-[#ffc83e]"
                    : "border-indigo-400 dark:border-indigo-500"
                    } shadow-xl transition-all duration-300`}

                >
                  {isMonthly && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg z-20 border-2 border-white dark:border-slate-900 ${sub.id === "pro-monthly-inr" ||
                      sub.id === "pro-monthly-usd" ||
                      sub.id === "pro-monthly-eur" ||
                      sub.id === "pro-monthly-gbp"
                      ? "bg-[#ffc83e] text-[rgb(69,69,69)]"
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      }`}>
                      Most Popular
                    </div>
                  )}

                  {isQuarterly && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest shadow-lg z-20 border-2 border-white dark:border-slate-900">
                      Best Value
                    </div>
                  )}

                  <div className={TITLE_H}>
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {sub.name}
                      </h3>
                      <span className="bg-[#5c3bfa] text-white text-[10px] font-bold px-2 py-1 rounded-sm">
                        {sub.discount || "75% OFF"}
                      </span>
                    </div>
                  </div>
                  <div className={DESC_H}>
                    <p className="text-sm text-slate-500">
                      {isIndia
                        ? "Flexible – cancel anytime"
                        : `Auto-renews ${sub.billing}`}
                    </p>
                  </div>

                  <div className={SELECTION_AREA_H}>
                    <div className="w-full">
                      {isMonthly ? (
                        <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                          Use up to{" "}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sub.credits || 200} credits
                          </span>{" "}
                          per month
                        </p>
                      ) : (
                        <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                          Includes{" "}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {sub.credits || 600} credits
                          </span>{" "}
                          for 3 months
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={PRICE_AREA_H}>
                    <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                      {pricingData.currency}
                      {sub.price}
                    </span>
                    <span className="text-sm text-slate-500 font-medium ml-1 mt-auto pb-1">
                      /{sub.period}
                    </span>
                  </div>

                  <div>
                    {isIndia ? (
                      <Button
                        onClick={() => handleSubscriptionCashfree(sub.id)}
                        className={`w-full h-12 rounded-full text-base font-bold mb-8 shadow-sm transition-all ${isQuarterly || isMonthly
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          }`}
                      >
                        {cta}
                      </Button>
                    ) : (
                      <div className="w-full mb-8 relative z-0 min-h-[52px]" style={{ colorScheme: "light" }}>


                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            color: "silver",
                            shape: "pill",
                            label: "subscribe",
                            height: 52,
                            tagline: false
                          }}
                          createSubscription={async (data, actions) => {
                            try {
                              console.log("createSubscription for planKey:", sub.id, "region:", region);

                              const res = await fetch("/api/payment/create-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ planKey: sub.id, region }),
                              });

                              const json = await res.json();
                              console.log("create-subscription response:", json);

                              if (!res.ok || json.error) {
                                throw new Error(json.error || `HTTP ${res.status}`);
                              }
                              if (!json.planId) {
                                throw new Error("Missing planId from API");
                              }

                              return actions.subscription.create({
                                plan_id: json.planId, // should be P-...
                              });
                            } catch (err: any) {
                              console.error("PayPal createSubscription error:", err);
                              toast({
                                title: "Error",
                                description: err.message || "Failed to initiate subscription",
                                variant: "destructive",
                              });
                              throw err; // important: rethrow so PayPal closes popup
                            }
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              console.log("PayPal Approved. SubID:", data.subscriptionID);

                              const res = await fetch("/api/payment/verify-paypal", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ subscriptionId: data.subscriptionID })
                              });
                              const result = await res.json();

                              if (result.success) {
                                toast({
                                  title: "Subscription Active!",
                                  description: "Welcome to Pro. Credits added!",
                                  className: "bg-green-600 text-white border-green-700",
                                });
                                refreshBalance();
                                setTimeout(() => {
                                  router.push("/dashboard");
                                }, 2000);
                              } else {
                                toast({
                                  title: "Verification Pending",
                                  description: "We're confirming your subscription. Please check your dashboard.",
                                });
                                router.push("/dashboard");
                              }
                            } catch (e) {
                              console.error("PayPal verification failed:", e);
                              toast({
                                title: "Payment Recorded",
                                description: "Your payment was successful. We'll update your credits shortly.",
                              });
                              router.push("/dashboard");
                            }
                          }}

                          onError={(err) => {
                            console.error("PayPal onError:", err);
                            toast({
                              title: "PayPal Error",
                              description: "The payment window was closed due to an error. Check console for details.",
                              variant: "destructive",
                            });
                          }}
                        />

                      </div>
                    )}

                    <div className="mt-2 text-left">
                      <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                      <ul className="space-y-3">
                        {proFeatures.slice(0, 4).map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"
                          >
                            <Check className="w-4 h-4 mt-0.5 text-indigo-500" />
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </PayPalScriptProvider>
        </div>
      </section>

      <AnimatePresence>
        {pendingOrder && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-4 border border-blue-200 dark:border-blue-900 flex items-center gap-4 max-w-sm">
              <div className="relative">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Checking Payment Status...
                </h4>
                <p className="text-xs text-slate-500">
                  {pendingOrder.cfSubscriptionId
                    ? `Subscription: ${pendingOrder.cfSubscriptionId}`
                    : `Order: ${pendingOrder.orderId}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-xs h-8"
                onClick={() => {
                  setPendingOrder(null);
                  setPendingStartedAt(null);
                }}
              >
                Hide
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
