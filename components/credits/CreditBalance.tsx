'use client';

import { memo } from 'react';
import { Coins, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useCredits } from '@/hooks/useCredits';

interface CreditBalanceProps {
  onUpgradeClick?: () => void;
}

function CreditBalance({ onUpgradeClick }: CreditBalanceProps) {
  const { balance, loading } = useCredits();

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
  const isLowCredits = credits <= 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Credit Balance
        </CardTitle>
        <CardDescription>
          Use credits to analyze resumes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{credits ?? 0}</p>
            <p className="text-sm text-muted-foreground">
              {credits === 1 ? 'Credit' : 'Credits'} remaining
            </p>
          </div>
          {onUpgradeClick && (
            <Button onClick={onUpgradeClick} variant="default">
              Buy Credits
            </Button>
          )}
        </div>

        {expiryDate && !hasExpired && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Expires on {format(new Date(expiryDate), 'MMM dd, yyyy')}</span>
          </div>
        )}

        {hasExpired && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your credits have expired. Purchase new credits to continue.
            </AlertDescription>
          </Alert>
        )}

        {isLowCredits && !hasExpired && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're running low on credits. Consider purchasing more to continue analyzing resumes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CreditBalance);
