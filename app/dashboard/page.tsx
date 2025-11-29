'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import CreditBalance from '@/components/credits/CreditBalance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Award, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

// Lazy load heavy components
const AnalysisHistory = lazy(() => import('@/components/credits/AnalysisHistory'));
const PaymentHistory = lazy(() => import('@/components/credits/PaymentHistory'));
const UpgradeModal = lazy(() => import('@/components/credits/UpgradeModal'));

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect('/signin');
  }

  const handleUpgradeSuccess = () => {
    window.location.reload();
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await fetch('/api/user/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setTotalAnalyses(data.totalAnalyses ?? 0);
        setMemberSince(data.memberSince ?? null);
      } catch (e) {
        setTotalAnalyses(0);
        setMemberSince(null);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your credits, analyses, and account activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <CreditBalance onUpgradeClick={() => setUpgradeModalOpen(true)} />
          </div>
          
          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                </div>
                <span className="truncate">Total Analyses</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Lifetime resume analyses
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <p className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {totalAnalyses ?? 0}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {totalAnalyses === 1 ? 'analysis completed' : 'analyses completed'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                </div>
                <span className="truncate">Member Since</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Account created
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 sm:pb-6">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : memberSince ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {format(new Date(memberSince), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Welcome aboard! 🎉
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis History */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <Suspense fallback={
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Analysis History</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your recent resume analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your analyses...</p>
                </div>
              </CardContent>
            </Card>
          }>
            <AnalysisHistory />
          </Suspense>
        </div>

        {/* Payment History */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <Suspense fallback={
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Payment History</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your credit purchases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading payments...</p>
                </div>
              </CardContent>
            </Card>
          }>
            <PaymentHistory />
          </Suspense>
        </div>

        {/* Upgrade Modal */}
        <Suspense fallback={null}>
          <UpgradeModal
            open={upgradeModalOpen}
            onOpenChange={setUpgradeModalOpen}
            onSuccess={handleUpgradeSuccess}
          />
        </Suspense>
      </div>
    </div>
  );
}
