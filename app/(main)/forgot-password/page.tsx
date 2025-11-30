"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState<{ error?: string; success?: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({});

        if (!email) {
            setMsg({ error: "Email is required" });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMsg({ error: data.error || "Something went wrong" });
            } else {
                setMsg({ success: data.message });
                setEmail("");
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
                        <h1 className="text-3xl font-semibold tracking-tight">Forgot Password</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Enter your email address and we'll send you a link to reset your password.
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
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                disabled={isLoading}
                            />
                        </div>

                        <motion.div whileHover={!isLoading ? { y: -1 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}>
                            <Button type="submit" disabled={isLoading} className="w-full py-6">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </motion.div>
                    </motion.form>

                    {/* Back to Sign In */}
                    <motion.div variants={fadeUp} initial="hidden" animate="show" className="text-center">
                        <Link
                            href="/signin"
                            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sign in
                        </Link>
                    </motion.div>

                </div>
            </motion.div>
        </div>
    );
}
