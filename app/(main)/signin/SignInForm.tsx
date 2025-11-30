"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Temporary/disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com'
];

// XSS/SQL Injection patterns
const MALICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /(\bor\b|\band\b).*[=<>]/gi,
  /union.*select/gi,
  /insert\s+into/gi,
  /delete\s+from/gi,
  /drop\s+table/gi,
];

export default function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [msg, setMsg] = useState<{ error?: string; success?: string }>({});

  // Email form state
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  // Field-specific error states for real-time validation
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Rate limiting
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);

  // Track which fields have been touched
  const [touchedFields, setTouchedFields] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
    confirm?: boolean;
  }>({});

  // Comprehensive email validation
  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email || !email.trim()) {
      return { valid: false, error: "Email address is required" };
    }

    const normalized = email.trim().toLowerCase();

    if (email !== email.trim()) {
      return { valid: false, error: "Email cannot have leading or trailing spaces" };
    }

    else if (email.includes('  ')) {
      return { valid: false, error: "Email cannot contain consecutive spaces" };
    }

    else if (!EMAIL_REGEX.test(normalized)) {
      return { valid: false, error: "🤖 Oops! That email looks off. Try again?" };
    }

    if (normalized.length > 254) {
      return { valid: false, error: "Email address is too long" };
    }

    const domain = normalized.split('@')[1];

    if (!domain || domain.length < 3) {
      return { valid: false, error: "Invalid email domain" };
    }

    // if (DISPOSABLE_DOMAINS.some(d => domain.includes(d))) {
    //   return { valid: false, error: "Temporary email addresses are not allowed" };
    // }

    const typoSuggestions: { [key: string]: string } = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'outlok.com': 'outlook.com',
      'hotmial.com': 'hotmail.com',
    };

    if (typoSuggestions[domain]) {
      return { valid: false, error: `Did you mean ${email.split('@')[0]}@${typoSuggestions[domain]}?` };
    }

    if ((email.match(/@/g) || []).length > 1) {
      return { valid: false, error: "Email address cannot contain multiple @ symbols" };
    }

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(normalized)) {
        return { valid: false, error: "Invalid characters detected in email" };
      }
    }

    return { valid: true };
  };

  // Password validation
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password) {
      return { valid: false, error: "Password is required" };
    }

    if (password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters long" };
    }

    if (password.length > 128) {
      return { valid: false, error: "Password is too long (max 128 characters)" };
    }

    if (!/\d/.test(password)) {
      return { valid: false, error: "Password must contain at least one number" };
    }

    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, error: "Password must contain at least one letter" };
    }

    const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      return { valid: false, error: "This password is too common. Please choose a stronger password" };
    }

    return { valid: true };
  };

  // Name validation
  const validateName = (name: string): { valid: boolean; error?: string } => {
    if (!name || !name.trim()) {
      return { valid: false, error: "Full name is required" };
    }

    const normalized = name.trim();

    if (normalized.length < 2) {
      return { valid: false, error: "Name must be at least 2 characters long" };
    }

    if (normalized.length > 100) {
      return { valid: false, error: "Name is too long" };
    }

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(normalized)) {
        return { valid: false, error: "Invalid characters in name" };
      }
    }

    if (!/^[a-zA-Z\s'-]+$/.test(normalized)) {
      return { valid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
    }

    return { valid: true };
  };

  // Rate limiting check
  const checkRateLimit = (): { allowed: boolean; error?: string } => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;

    if (timeSinceLastAttempt > 15 * 60 * 1000) {
      setAttemptCount(0);
      setLastAttemptTime(now);
      return { allowed: true };
    }

    if (attemptCount >= 5) {
      const waitTime = Math.ceil((15 * 60 * 1000 - timeSinceLastAttempt) / 60000);
      return {
        allowed: false,
        error: `Too many attempts. Please try again in ${waitTime} minute${waitTime !== 1 ? 's' : ''}`
      };
    }

    setAttemptCount(prev => prev + 1);
    setLastAttemptTime(now);
    return { allowed: true };
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));

    // Clear field error when user starts typing again
    if (touchedFields[name as keyof typeof touchedFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    setMsg({});
  };

  // Handle blur events for real-time validation
  const handleBlur = (fieldName: keyof typeof form) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    const value = form[fieldName];
    let validation: { valid: boolean; error?: string } = { valid: true };

    switch (fieldName) {
      case 'name':
        if (mode === 'signup') {
          validation = validateName(value);
        }
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'password':
        validation = validatePassword(value);
        break;
      case 'confirm':
        if (mode === 'signup') {
          if (!value) {
            validation = { valid: false, error: "Please confirm your password" };
          } else if (value !== form.password) {
            validation = { valid: false, error: "Passwords do not match" };
          }
        }
        break;
    }

    if (!validation.valid) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: validation.error }));
    } else {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const onGoogle = async () => {
    try {
      const rateLimitCheck = checkRateLimit();
      if (!rateLimitCheck.allowed) {
        setMsg({ error: rateLimitCheck.error || "Too many attempts" });
        return;
      }

      setIsLoading(true);
      await signIn("google", { callbackUrl: "/profile" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setMsg({ error: "Unable to sign in with Google. Please try again later" });
      setIsLoading(false);
    }
  };

  const onSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({});

    try {
      const rateLimitCheck = checkRateLimit();
      if (!rateLimitCheck.allowed) {
        setMsg({ error: rateLimitCheck.error || "Too many attempts" });
        return;
      }

      const emailValidation = validateEmail(form.email);
      if (!emailValidation.valid) {
        setMsg({ error: emailValidation.error });
        return;
      }

      if (!form.password || form.password.trim() === "") {
        setMsg({ error: "Password is required" });
        return;
      }

      setIsLoading(true);

      const normalizedEmail = form.email.trim().toLowerCase();

      const res = await signIn("credentials", {
        email: normalizedEmail,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        let errorMessage = "Invalid email or password";

        if (res.error.toLowerCase().includes("verify your email")) {
          errorMessage = "Please verify your email before signing in. We've sent a verification link to your email address.";
        } else if (res.error.includes("credentials")) {
          errorMessage = "Invalid email or password. Please check and try again";
        } else if (res.error.includes("not found")) {
          errorMessage = "No account found with this email address";
        } else if (res.error.includes("disabled") || res.error.includes("suspended")) {
          errorMessage = "This account has been disabled. Please contact support";
        } else if (res.error.includes("network") || res.error.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again";
        } else if (res.error.includes("timeout")) {
          errorMessage = "Request timed out. Please try again";
        }

        setMsg({ error: errorMessage });
        setIsLoading(false);
      } else {
        setMsg({ success: "Signed in successfully. Redirecting..." });
        const callbackUrl = searchParams.get("callbackUrl") || "/profile";
        setTimeout(() => router.push(callbackUrl), 1000);
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setMsg({ error: "An unexpected error occurred. Please try again later" });
      setIsLoading(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({});

    try {
      const rateLimitCheck = checkRateLimit();
      if (!rateLimitCheck.allowed) {
        setMsg({ error: rateLimitCheck.error || "Too many attempts" });
        return;
      }

      const nameValidation = validateName(form.name);
      if (!nameValidation.valid) {
        setMsg({ error: nameValidation.error });
        return;
      }

      const emailValidation = validateEmail(form.email);
      if (!emailValidation.valid) {
        setMsg({ error: emailValidation.error });
        return;
      }

      const passwordValidation = validatePassword(form.password);
      if (!passwordValidation.valid) {
        setMsg({ error: passwordValidation.error });
        return;
      }

      if (form.password !== form.confirm) {
        setMsg({ error: "Passwords do not match" });
        return;
      }

      setIsLoading(true);

      const normalizedEmail = form.email.trim().toLowerCase();
      const normalizedName = form.name.trim();

      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password: form.password
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        let errorMessage = data.error || "Registration failed";

        if (r.status === 409 || errorMessage.includes("exists") || errorMessage.includes("already registered")) {
          errorMessage = "An account with this email already exists. Please sign in instead";
        } else if (r.status === 400) {
          errorMessage = data.error || "Invalid registration data. Please check your information";
        } else if (r.status === 429) {
          errorMessage = "Too many registration attempts. Please try again later";
        } else if (r.status === 500) {
          errorMessage = "Server error. Please try again later";
        } else if (r.status === 503) {
          errorMessage = "Service temporarily unavailable. Please try again later";
        } else if (errorMessage.includes("database") || errorMessage.includes("connection")) {
          errorMessage = "Unable to connect to server. Please try again later";
        }

        setMsg({ error: errorMessage });
        setIsLoading(false);
      } else {
        setMsg({ success: data.message || "Account created successfully! Redirecting to sign in..." });
        setTimeout(() => {
          const callbackUrl = searchParams.get("callbackUrl");
          setMode("signin");
          // Update URL to reflect signin mode while keeping callbackUrl
          const newUrl = callbackUrl 
            ? `/signin?mode=signin&callbackUrl=${encodeURIComponent(callbackUrl)}`
            : `/signin?mode=signin`;
          router.push(newUrl);
          
          setForm({ name: "", email: form.email, password: "", confirm: "" });
          setFieldErrors({});
          setTouchedFields({});
          setMsg({});
        }, 2000);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Registration error:", error);

      if (error instanceof TypeError && error.message.includes("fetch")) {
        setMsg({ error: "Network error. Please check your internet connection" });
      } else {
        setMsg({ error: "An unexpected error occurred. Please try again later" });
      }

      setIsLoading(false);
    }
  };

  const title = mode === "signup" ? "Create account" : "Welcome back";
  const subtitle = mode === "signup" ? "Sign up to get started" : "Sign in to continue";

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } }}
        className="w-full max-w-md"
      >
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl p-8 space-y-6">

          {/* Header */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          </motion.div>

          {/* Error/Success Messages */}
          {msg.error && (
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Alert variant="destructive" className="border-red-200 dark:border-red-900">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{msg.error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {msg.success && (
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="ml-2">{msg.success}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Google Sign-in Button */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-4">
            <motion.button
              onClick={onGoogle}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-700 py-3.5 px-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!isLoading ? { y: -2 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Or</span>
              </div>
            </div>
          </motion.div>

          {/* Email/Password Form */}
          <motion.form
            onSubmit={mode === "signup" ? onSignup : onSignin}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={onChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="John Doe"
                  disabled={isLoading}
                  maxLength={100}
                  autoComplete="name"
                  className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            {/* Email field */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={onChange}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
                maxLength={254}
                className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {fieldErrors.email && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {/* Forgot password link - only on sign in */}
                {mode === "signin" && (
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={onChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={128}
                  className={`pr-10 ${fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm password (signup only) */}
            {mode === "signup" && (
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={form.confirm}
                    onChange={onChange}
                    onBlur={() => handleBlur('confirm')}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className={`pr-10 ${fieldErrors.confirm ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirm && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.confirm}
                  </p>
                )}
              </div>
            )}

            {/* Submit button */}
            <motion.div whileHover={!isLoading ? { y: -1 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
              <Button type="submit" disabled={isLoading} className="w-full py-6 mt-2">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait…
                  </>
                ) : (
                  mode === "signup" ? "Create account" : "Sign in"
                )}
              </Button>
            </motion.div>
          </motion.form>

          {/* Toggle between sign-in/sign-up */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                const callbackUrl = searchParams.get("callbackUrl");
                const newMode = mode === "signup" ? "signin" : "signup";
                const newUrl = callbackUrl 
                  ? `/signin?mode=${newMode}&callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : `/signin?mode=${newMode}`;
                router.push(newUrl);
                setMode(newMode);
                setMsg({});
                setForm({ name: "", email: "", password: "", confirm: "" });
                setFieldErrors({});
                setTouchedFields({});
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </motion.div>

          {/* Terms and Privacy */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
