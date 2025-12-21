import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export interface UserStatus {
    isPro: boolean;
    loading: boolean;
    hasActiveSubscription: boolean;
    hasCredits: boolean;
    credits: number;
}

/**
 * Hook to check if user is a Pro user
 * A user is considered Pro if they have:
 * - An active subscription (subscriptionStatus === 'active'), OR
 * - Credits remaining (credits > 0)
 */
export function useUserStatus(): UserStatus {
    const { data: session, status } = useSession();
    const [userStatus, setUserStatus] = useState<UserStatus>({
        isPro: false,
        loading: true,
        hasActiveSubscription: false,
        hasCredits: false,
        credits: 0,
    });

    useEffect(() => {
        const fetchUserStatus = async () => {
            if (status === "loading") {
                setUserStatus((prev) => ({ ...prev, loading: true }));
                return;
            }

            if (!session?.user?.email) {
                // Not authenticated - treat as free user
                setUserStatus({
                    isPro: false,
                    loading: false,
                    hasActiveSubscription: false,
                    hasCredits: false,
                    credits: 0,
                });
                return;
            }

            try {
                const response = await fetch("/api/user/status");
                if (!response.ok) {
                    throw new Error("Failed to fetch user status");
                }

                const data = await response.json();
                const hasActiveSubscription = data.subscriptionStatus === "active";
                const hasCredits = (data.credits || 0) > 0;
                const isPro = hasActiveSubscription || hasCredits;

                setUserStatus({
                    isPro,
                    loading: false,
                    hasActiveSubscription,
                    hasCredits,
                    credits: data.credits || 0,
                });
            } catch (error) {
                console.error("Error fetching user status:", error);
                // On error, default to free user
                setUserStatus({
                    isPro: false,
                    loading: false,
                    hasActiveSubscription: false,
                    hasCredits: false,
                    credits: 0,
                });
            }
        };

        fetchUserStatus();
    }, [session, status]);

    return userStatus;
}
