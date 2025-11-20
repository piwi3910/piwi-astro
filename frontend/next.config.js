/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  // Note: Response compression (gzip/brotli) is enabled by default in Next.js production builds
  // No explicit configuration needed - Next.js automatically compresses responses
  // Suppress middleware deprecation warning - we're intentionally using middleware for auth
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
