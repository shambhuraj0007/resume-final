'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Package {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  validityMonths: number;
  description: string;
  features: string[];
  popular?: boolean;
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function UpgradeModal({ open, onOpenChange, onSuccess }: UpgradeModalProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { toast } = useToast();

  const packagesCache = useRef<Package[]>([]);
  const activeOrderRef = useRef<string | null>(null);
  const dismissHandledRef = useRef(false);
  const razorpayInstanceRef = useRef<any>(null);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (open && packages.length === 0) {
      fetchPackages();
    }

    if (open) {
      dismissHandledRef.current = false;
      activeOrderRef.current = null;
    }
  }, [open, packages.length]);

  const fetchPackages = useCallback(async () => {
    if (packagesCache.current.length > 0) {
      setPackages(packagesCache.current);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/payment/packages', {
        next: { revalidate: 3600 },
      } as any);
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      const data = await response.json();
      packagesCache.current = data.packages || [];
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load packages. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadRazorpayScript = useCallback(() => {
    if (scriptLoaded || window.Razorpay) {
      setScriptLoaded(true);
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, [scriptLoaded]);

  const handlePurchase = useCallback(async (packageId: string) => {
    if (activeOrderRef.current) {

      return;
    }

    if (!scriptLoaded && !window.Razorpay) {
      toast({
        title: 'Loading...',
        description: 'Payment system is loading. Please try again in a moment.',
      });
      await loadRazorpayScript();
      return;
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      console.error('Razorpay key is not configured');
      toast({
        title: 'Configuration Error',
        description: 'Payment system is not properly configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingPackage(packageId);
    dismissHandledRef.current = false;

    try {
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: packageId }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }


      activeOrderRef.current = orderData.orderId;

      // **KEY FIX: Close Dialog before opening Razorpay**
      onOpenChange(false);

      // Wait for Dialog animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ShortlistAI',
        description: `Purchase ${packages.find(p => p.id === packageId)?.name}`,
        order_id: orderData.orderId,
        redirect: false,
        retry: { enabled: false },
        theme: {
          color: '#3b82f6',
          backdrop_color: 'rgba(0, 0, 0, 0.6)',
        },
        config: {
          display: {
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        handler: async function (response: any) {


          activeOrderRef.current = null;
          dismissHandledRef.current = true;

          try {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok) {
              toast({
                title: 'Success!',
                description: verifyData.message,
              });
              if (onSuccess) onSuccess();
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: 'Error',
              description: 'Payment verification failed. Please contact support.',
              variant: 'destructive',
            });
          } finally {
            setProcessingPackage(null);
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        modal: {
          ondismiss: function () {
            if (dismissHandledRef.current) {

              return;
            }

            dismissHandledRef.current = true;


            activeOrderRef.current = null;

            if (razorpayInstanceRef.current) {
              try {
                razorpayInstanceRef.current.close();
                razorpayInstanceRef.current = null;
              } catch (e) {
                console.error('Error closing Razorpay:', e);
              }
            }

            setTimeout(() => {
              setProcessingPackage(null);
              toast({
                title: 'Payment Cancelled',
                description: 'You cancelled the payment process.',
                variant: 'default',
              });
              // Reopen upgrade modal if payment was cancelled
              onOpenChange(true);
            }, 100);
          },
          escape: true,
          backdropclose: true,
          confirm_close: true,
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpayInstanceRef.current = razorpay;

      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        activeOrderRef.current = null;
        dismissHandledRef.current = true;

        setProcessingPackage(null);
        toast({
          title: 'Payment Failed',
          description: response.error.description || 'Payment could not be processed. Please try again.',
          variant: 'destructive',
        });

        // Reopen upgrade modal on failure
        setTimeout(() => onOpenChange(true), 300);
      });

      razorpay.open();

    } catch (error) {
      console.error('Purchase error:', error);

      activeOrderRef.current = null;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

      toast({
        title: isRateLimit ? 'Rate Limit Reached' : 'Payment Failed',
        description: isRateLimit
          ? 'Too many payment attempts. Please wait 5-10 minutes and try again.'
          : 'Unable to process payment. Please try again or contact support.',
        variant: 'destructive',
      });
      setProcessingPackage(null);

      // Reopen upgrade modal on error
      setTimeout(() => onOpenChange(true), 300);
    }
  }, [packages, scriptLoaded, loadRazorpayScript, toast, onOpenChange, onSuccess]);

  useEffect(() => {
    return () => {
      if (razorpayInstanceRef.current) {
        try {
          if ((razorpayInstanceRef.current as any)._modalTimeout) {
            clearTimeout((razorpayInstanceRef.current as any)._modalTimeout);
          }
          razorpayInstanceRef.current.close();
          razorpayInstanceRef.current = null;
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      }
      activeOrderRef.current = null;
      dismissHandledRef.current = false;
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Upgrade Your Credits
          </DialogTitle>
          <DialogDescription>
            Choose a package that fits your needs. All packages come with 3 months validity.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="h-8 w-1/2 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="h-4 w-4 bg-gray-200 rounded-full mt-0.5"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No packages available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative ${pkg.popular ? 'border-primary shadow-lg' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
                onClick={() => !processingPackage && handlePurchase(pkg.id)}
                aria-disabled={processingPackage !== null}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">
                      ₹{pkg.price}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pkg.credits} {pkg.credits === 1 ? 'Credit' : 'Credits'}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-0">
                  <Button
                    className="w-full rounded-t-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!processingPackage) handlePurchase(pkg.id);
                    }}
                    disabled={processingPackage !== null}
                    variant={pkg.popular ? 'default' : 'outline'}
                  >
                    {processingPackage === pkg.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
