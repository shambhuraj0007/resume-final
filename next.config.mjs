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
  // Ensure Chromium's brotli binaries are included in the serverless bundle
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
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
};

export default nextConfig;
