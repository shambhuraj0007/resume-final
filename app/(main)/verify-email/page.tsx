"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
          // Redirect to sign in after 3 seconds
          setTimeout(() => {
            router.push("/signin");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Email Verification
            </h1>
          </div>

          {/* Status */}
          <div className="flex flex-col items-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">
                  Verifying your email...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-600" />
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Redirecting to sign in...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-600" />
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button
                  onClick={() => router.push("/signin")}
                  className="mt-4"
                >
                  Go to Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
