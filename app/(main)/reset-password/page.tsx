"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

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

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState<{ error?: string; success?: string }>({});

    // Field-specific error states for real-time validation
    const [fieldErrors, setFieldErrors] = useState<{
        password?: string;
        confirm?: string;
    }>({});

    // Track which fields have been touched
    const [touchedFields, setTouchedFields] = useState<{
        password?: boolean;
        confirm?: boolean;
    }>({});

    useEffect(() => {
        if (!token) {
            setMsg({ error: "Invalid or missing reset token. Please request a new password reset link." });
        }
    }, [token]);

    // Comprehensive password validation
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

        // Check for common weak passwords
        const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345', 'password123'];
        if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
            return { valid: false, error: "This password is too common. Please choose a stronger password" };
        }

        // Check for malicious patterns
        for (const pattern of MALICIOUS_PATTERNS) {
            if (pattern.test(password)) {
                return { valid: false, error: "Invalid characters detected in password" };
            }
        }

        return { valid: true };
    };

    // Handle blur events for real-time validation
    const handleBlur = (fieldName: 'password' | 'confirm') => {
        setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

        let validation: { valid: boolean; error?: string } = { valid: true };

        if (fieldName === 'password') {
            validation = validatePassword(password);
        } else if (fieldName === 'confirm') {
            if (!confirmPassword) {
                validation = { valid: false, error: "Please confirm your password" };
            } else if (confirmPassword !== password) {
                validation = { valid: false, error: "Passwords do not match" };
            }
        }

        if (!validation.valid) {
            setFieldErrors((prev) => ({ ...prev, [fieldName]: validation.error }));
        } else {
            setFieldErrors((prev) => ({ ...prev, [fieldName]: undefined }));
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        
        // Clear field error when user starts typing again
        if (touchedFields.password) {
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
        }
        
        setMsg({});
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmPassword(e.target.value);
        
        // Clear field error when user starts typing again
        if (touchedFields.confirm) {
            setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
        }
        
        setMsg({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({});

        if (!token) {
            setMsg({ error: "Invalid or missing reset token. Please request a new password reset link." });
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            setMsg({ error: passwordValidation.error });
            setFieldErrors((prev) => ({ ...prev, password: passwordValidation.error }));
            return;
        }

        // Validate password match
        if (password !== confirmPassword) {
            setMsg({ error: "Passwords do not match" });
            setFieldErrors((prev) => ({ ...prev, confirm: "Passwords do not match" }));
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                let errorMessage = data.error || "Something went wrong";

                // Handle specific error cases
                if (res.status === 400) {
                    errorMessage = data.error || "Invalid password reset request";
                } else if (res.status === 401 || errorMessage.includes("expired") || errorMessage.includes("invalid token")) {
                    errorMessage = "This password reset link has expired or is invalid. Please request a new one";
                } else if (res.status === 429) {
                    errorMessage = "Too many attempts. Please try again later";
                } else if (res.status === 500) {
                    errorMessage = "Server error. Please try again later";
                } else if (errorMessage.includes("database") || errorMessage.includes("connection")) {
                    errorMessage = "Unable to connect to server. Please try again later";
                }

                setMsg({ error: errorMessage });
            } else {
                setMsg({ success: "Password reset successfully! Redirecting to sign in..." });
                setTimeout(() => {
                    router.push("/signin");
                }, 2000);
            }
        } catch (error) {
            console.error("Password reset error:", error);

            if (error instanceof TypeError && error.message.includes("fetch")) {
                setMsg({ error: "Network error. Please check your internet connection" });
            } else {
                setMsg({ error: "An unexpected error occurred. Please try again later" });
            }
        } finally {
            setIsLoading(false);
        }
    };

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
                        <h1 className="text-3xl font-semibold tracking-tight">Reset Password</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Enter your new password below
                        </p>
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

                    {/* Form */}
                    <motion.form
                        onSubmit={handleSubmit}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4"
                    >
                        {/* New Password field */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={handlePasswordChange}
                                    onBlur={() => handleBlur('password')}
                                    placeholder="••••••••"
                                    disabled={isLoading || !token}
                                    autoComplete="new-password"
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
                                    disabled={isLoading || !token}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {fieldErrors.password}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Must be at least 8 characters with letters and numbers
                            </p>
                        </div>

                        {/* Confirm Password field */}
                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={handleConfirmPasswordChange}
                                    onBlur={() => handleBlur('confirm')}
                                    placeholder="••••••••"
                                    disabled={isLoading || !token}
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
                                    disabled={isLoading || !token}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {fieldErrors.confirm && (
                                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {fieldErrors.confirm}
                                </p>
                            )}
                        </div>

                        {/* Submit button */}
                        <motion.div whileHover={!isLoading ? { y: -1 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
                            <Button 
                                type="submit" 
                                disabled={isLoading || !token} 
                                className="w-full py-6 mt-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting password...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </motion.div>
                    </motion.form>

                    {/* Back to Sign In */}
                    <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center text-sm">
                        <Link
                            href="/signin"
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1"
                        >
                            ← Back to Sign In
                        </Link>
                    </motion.div>

                </div>
            </motion.div>
        </div>
    );
}
