/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  // Suppress middleware deprecation warning - we're intentionally using middleware for auth
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
