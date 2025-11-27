/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    // In development, disable image optimization to allow localhost/private IPs
    // In production, images will be served from public URLs (S3, etc.)
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9002',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9002',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.backblazeb2.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
    ],
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
