"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SignInForm from "./SignInForm";

export default function SignIn() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    if (session?.user) {
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push('/profile');
      }
    }
  }, [session, router, callbackUrl]);

  // Don't show sign-in form if already authenticated
  if (session) {
    return null;
  }

  return <SignInForm />;
}
