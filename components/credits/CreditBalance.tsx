'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, AlertCircle, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { useCredits } from '@/hooks/useCredits';

interface CreditBalanceProps {
  onUpgradeClick?: () => void;
}

function CreditBalance({ onUpgradeClick }: CreditBalanceProps) {
  const router = useRouter();
  const { balance, loading, isPro, isSubscriber } = useCredits();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const credits = balance?.credits ?? 0;
  const expiryDate = balance?.expiryDate;
  const hasExpired = balance?.hasExpired ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscriber ? <Award className="h-5 w-5 text-purple-600" /> : <Coins className="h-5 w-5" />}
          {isSubscriber ? "Current Plan" : "Credit Balance"}
        </CardTitle>
        <CardDescription>
          {isSubscriber ? "Manage your subscription" : "Use credits to analyze resumes"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscriber View */}
        {isSubscriber && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-100">Pro Monthly</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Renews: {expiryDate ? format(new Date(expiryDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => router.push('/pricing')}
              >
                Change Plan
              </Button>
            </div>
          </div>
        )}

        {/* Non-Pro View (Pack or Free) */}
        {!isSubscriber && (
          <div className="space-y-4">
            {/* Plan Status Header */}
            <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 border rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Plan: {isPro ? 'Pro (One-Time)' : 'Free Tier'}</span>
                {isPro && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">PRO</span>
                )}
                <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600">Active</span>
              </div>
              {credits === 0 && (
                <span className="text-xs text-muted-foreground">Limited Access</span>
              )}
            </div>

            {/* Credits Section */}
            {credits > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{credits}</p>
                    <p className="text-sm text-muted-foreground">
                      Credits left
                    </p>
                  </div>
                  {onUpgradeClick && (
                    <Button onClick={onUpgradeClick} variant="default">
                      {isPro ? "Get More" : "Upgrade"}
                    </Button>
                  )}
                </div>
                {expiryDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 p-2 rounded">
                    <Calendar className="h-3 w-3" />
                    <span>Expires in {formatDistanceToNow(new Date(expiryDate))}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Zero Credits / Free User Section */
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground px-1">
                  {isPro
                    ? "You've used all your credits. Get more to continue."
                    : `${credits} scans remaining this month (rolling)`}
                </p>
                {onUpgradeClick && (
                  <Button onClick={onUpgradeClick} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
                    {isPro ? "Get More Credits" : "Upgrade to Pro"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Alerts */}
        {hasExpired && !isPro && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your credits have expired.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CreditBalance);
