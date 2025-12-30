/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "@sparticuz/chromium",
      "puppeteer-core",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable SWC minification
  swcMinify: true,
  // Production optimizations
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com https://www.paypal.com https://sdk.cashfree.com",
              "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com https://www.paypal.com https://sdk.cashfree.com",
              "img-src 'self' blob: data: https: https://www.google-analytics.com https://shortlistai.xyz https://cdn.razorpay.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
              "connect-src 'self' https://www.google-analytics.com https://api.razorpay.com https://api.cashfree.com https://www.paypal.com https://*.paypal.com",
              "frame-src 'self' https://checkout.razorpay.com https://www.paypal.com https://*.paypal.com https://sdk.cashfree.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
