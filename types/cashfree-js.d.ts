declare module '@cashfreepayments/cashfree-js' {
    export interface LoadOptions {
        mode: 'sandbox' | 'production';
    }

    export interface CheckoutOptions {
        paymentSessionId: string;
        redirectTarget?: '_self' | '_modal' | '_top' | '_blank';
        returnUrl?: string;
    }

    export interface CashfreeInstance {
        checkout(options: CheckoutOptions): Promise<{
            error?: { message: string };
            redirect?: boolean;
            paymentDetails?: any;
        }>;
        // Add other methods if needed: pay(), create(), mount(), etc.
    }

    export function load(options: LoadOptions): Promise<CashfreeInstance | null>;
}
