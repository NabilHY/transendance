/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  webpack: (config) => {
    // Ensure `@/...` imports resolve reliably in all environments (docker/dev/prod).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(process.cwd()),
    };
    return config;
  },
};

export default nextConfig;


