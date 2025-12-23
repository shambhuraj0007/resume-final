import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export interface UserStatus {
    isPro: boolean;
    isSubscriber: boolean;
    loading: boolean;
    hasActiveSubscription: boolean;
    hasCredits: boolean;
    credits: number;
    isPaidUser: boolean;
    nextCreditReset?: string;
    lastCreditReset?: string;
}

/**
 * Hook to check if user is a Pro user
 * A user is considered Pro if they have:
 * - An active subscription (subscriptionStatus === 'active'), OR
 * - They have purchased credits (isPaidUser === true)
 */
export function useUserStatus(): UserStatus {
    const { data: session, status } = useSession();
    const [userStatus, setUserStatus] = useState<UserStatus>({
        isPro: false,
        isSubscriber: false,
        loading: true,
        hasActiveSubscription: false,
        hasCredits: false,
        credits: 0,
        isPaidUser: false,
    });

    useEffect(() => {
        const fetchUserStatus = async () => {
            if (status === "loading") {
                setUserStatus((prev) => ({ ...prev, loading: true }));
                return;
            }

            // Removed early return for missing session to support phone users
            // Phone users have a JWT in cookies which the API handles

            try {
                const response = await fetch("/api/user/status");
                if (!response.ok) {
                    throw new Error("Failed to fetch user status");
                }

                const data = await response.json();

                setUserStatus({
                    isPro: data.isPro, // Use consolidated isPro from backend
                    isSubscriber: data.isSubscriber || false,
                    loading: false,
                    hasActiveSubscription: data.subscriptionStatus === "active",
                    hasCredits: (data.credits || 0) > 0,
                    credits: data.credits || 0,
                    isPaidUser: data.isPaidUser || false,
                    nextCreditReset: data.nextCreditReset,
                    lastCreditReset: data.lastCreditReset,
                });
            } catch (error) {
                console.error("Error fetching user status:", error);
                // On error, default to free user
                setUserStatus({
                    isPro: false,
                    isSubscriber: false,
                    loading: false,
                    hasActiveSubscription: false,
                    hasCredits: false,
                    credits: 0,
                    isPaidUser: false,
                });
            }
        };

        fetchUserStatus();
    }, [session, status]);

    return userStatus;
}
