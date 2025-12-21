declare global {
    interface Window {
        Cashfree: (config: { mode: 'sandbox' | 'production' }) => {
            checkout: (options: {
                paymentSessionId: string;
                redirectTarget: '_modal' | '_self' | '_blank';
            }) => Promise<void>;
        };
    }
}

export { };
