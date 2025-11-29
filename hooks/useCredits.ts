'use client';

import { useState, useEffect, useCallback } from 'react';

interface CreditBalance {
  credits: number;
  expiryDate: string | null;
  hasExpired: boolean;
}

let cachedBalance: CreditBalance | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000;

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance | null>(cachedBalance);
  const [loading, setLoading] = useState(!cachedBalance);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchBalance = async () => {
      const now = Date.now();
      if (cachedBalance && (now - cacheTimestamp) < CACHE_DURATION) {
        if (isMounted) {
          setBalance(cachedBalance);
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setLoading(true);

        const response = await fetch('/api/credits/balance', {
          signal: controller.signal,
        });

        if (!response.ok) {
          // Treat 401 as "not logged in" instead of an error to avoid noisy logs
          if (response.status === 401) {
            if (isMounted) {
              setBalance(null);
              setError(null);
            }
            return;
          }

          throw new Error('Failed to fetch balance');
        }

        const data = await response.json();

        cachedBalance = data;
        cacheTimestamp = Date.now();

        if (isMounted) {
          setBalance(data);
          setError(null);
        }
      } catch (err: any) {
        // CRITICAL: Properly ignore AbortError
        if (err.name === 'AbortError') {
          console.log('Fetch aborted (expected in Strict Mode)');
          return; // Don't set error state for aborts
        }
        
        if (isMounted) {
          setError('Failed to fetch balance');
          console.error('Error fetching credit balance:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBalance();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const checkCredits = async (requiredCredits: number = 1): Promise<boolean> => {
    try {
      const response = await fetch('/api/credits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredCredits }),
      });

      const data = await response.json();
      return data.hasCredits;
    } catch (err) {
      console.error('Error checking credits:', err);
      return false;
    }
  };

  const refreshBalance = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    
    try {
      const response = await fetch('/api/credits/balance', {
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated – just clear local state, no error
          setBalance(null);
          setError(null);
          return;
        }

        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();

      cachedBalance = data;
      cacheTimestamp = Date.now();

      setBalance(data);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Refresh aborted');
        return;
      }
      
      setError('Failed to fetch balance');
      console.error('Error fetching credit balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    balance,
    loading,
    error,
    checkCredits,
    refreshBalance,
    hasCredits: balance ? balance.credits > 0 && !balance.hasExpired : false,
  };
}
