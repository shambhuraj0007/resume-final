"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SignInForm from "./SignInForm";

export default function SignIn() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      router.push('/profile');
    }
  }, [session, router]);

  // Don't show sign-in form if already authenticated
  if (session) {
    return null;
  }

  return <SignInForm />;
}
