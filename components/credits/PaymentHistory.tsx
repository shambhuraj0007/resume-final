'use client';

import { useEffect, useState } from 'react';
import { CreditCard, IndianRupee, CalendarClock, Loader2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PaymentItem {
  _id: string;
  orderId: string;
  razorpayOrderId?: string;
  paymentId?: string;
  amount: number;
  currency: string;
  credits: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  packageType: 'starter' | 'basic' | 'pro' | 'premium';
  validityMonths: number;
  paymentMethod?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

export default function PaymentHistory() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPage(1);
  }, []);

  const fetchPage = async (p: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payment/history?page=${p}&limit=10`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      }
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchPage(page);
    setRefreshing(false);
  };

  const statusBadge = (status: PaymentItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">failed</Badge>;
      case 'refunded':
        return <Badge className="bg-amber-500 hover:bg-amber-600">refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statusIcon = (status: PaymentItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your recent payments and purchases ({total} total)
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No payments yet</p>
            <p className="text-sm">Your purchases will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((t) => (
              <div key={t._id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1">{statusIcon(t.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">
                        {t.packageType.charAt(0).toUpperCase() + t.packageType.slice(1)} Pack
                      </p>
                      {statusBadge(t.status)}
                      <Badge variant="outline" className="text-xs">
                        {t.credits} {t.credits === 1 ? 'credit' : 'credits'}
                      </Badge>
                    </div>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4" />
                        <span>
                          {t.amount} {t.currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <span>{format(new Date(t.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-xs">Order:</span>
                        <span className="ml-1 text-xs font-mono truncate">{t.razorpayOrderId || t.orderId}</span>
                      </div>
                      {t.paymentId && (
                        <div className="truncate">
                          <span className="text-xs">Payment:</span>
                          <span className="ml-1 text-xs font-mono truncate">{t.paymentId}</span>
                        </div>
                      )}
                      {t.failureReason && (
                        <div className="sm:col-span-2 text-xs text-red-500">{t.failureReason}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">Page {page} of {pages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => fetchPage(page + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
