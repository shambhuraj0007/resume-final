"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface PhoneAuthProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export default function PhoneAuth({ onSuccess, redirectTo = '/dashboard' }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as: +91 XXXXX XXXXX
    if (digits.length <= 10) {
      return digits.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
    }
    return digits.slice(0, 10).replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: `+91${phoneNumber.replace(/\D/g, '')}` }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the verification code",
        });
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    if (isNewUser && !name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: `+91${phoneNumber.replace(/\D/g, '')}`, 
          otp,
          name: name.trim() || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Phone number verified successfully!",
        });
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectTo);
        }
      } else {
        throw new Error(data.error || 'Failed to verify OTP');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
  };

  return (
    <div className="w-full space-y-6">
        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="flex">
                <div className="flex items-center px-3 py-2 border border-r-0 rounded-l-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  +91
                </div>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formatPhoneNumber(phoneNumber)}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="rounded-l-none"
                  maxLength={11}
                />
              </div>
            </div>

            <Button 
              onClick={handleSendOTP} 
              disabled={loading || !phoneNumber}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            {isNewUser && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerifyOTP} 
                disabled={loading || !otp}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={handleSendOTP}
                disabled={loading}
                className="text-sm"
              >
                Didn't receive OTP? Resend
              </Button>
            </div>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setIsNewUser(!isNewUser)}
                className="text-sm"
              >
                {isNewUser ? 'Already have an account?' : 'New user? Enter your name'}
              </Button>
            </div>
          </>
        )}
    </div>
  );
}
