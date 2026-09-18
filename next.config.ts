import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output for Docker — packages only what's needed at runtime
  output: 'standalone',
  typedRoutes: true,
};

export default nextConfig;
