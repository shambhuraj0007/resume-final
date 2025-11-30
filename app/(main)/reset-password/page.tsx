"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

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

    useEffect(() => {
        if (!token) {
            setMsg({ error: "Invalid or missing reset token." });
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({});

        if (!token) {
            setMsg({ error: "Invalid or missing reset token." });
            return;
        }

        if (password.length < 8) {
            setMsg({ error: "Password must be at least 8 characters long" });
            return;
        }

        if (password !== confirmPassword) {
            setMsg({ error: "Passwords do not match" });
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
                setMsg({ error: data.error || "Something went wrong" });
            } else {
                setMsg({ success: "Password reset successfully! Redirecting to sign in..." });
                setTimeout(() => {
                    router.push("/signin");
                }, 2000);
            }
        } catch (error) {
            setMsg({ error: "An unexpected error occurred" });
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
                            Enter your new password below.
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
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <motion.div whileHover={!isLoading ? { y: -1 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
                            <Button type="submit" disabled={isLoading} className="w-full py-6">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                        </motion.div>
                    </motion.form>

                </div>
            </motion.div>
        </div>
    );
}
