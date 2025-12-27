/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  // Ignore TypeScript errors during build (allows build to proceed with type errors)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable Fast Refresh for better hot reloading
  reactRefresh: true,
  // Webpack configuration for better file watching in Docker
  // Enable polling for both dev and production to ensure hot reload always works
  webpack: (config, { dev, isServer }) => {
    // Always enable polling for file watching (works better in Docker/WSL)
    // This ensures hot reload works regardless of NODE_ENV
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding once the first file changed
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
      ],
      followSymlinks: false,
    };
    
    // Ensure webpack-dev-server hot reload is enabled
    if (dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
    }
    
    return config;
  },
  async rewrites() {
    // Get usr-manag URL from env
    // Prefer USR_MANAG_SERVICE_URL (Docker service name) over USR_MANAG_URL (localhost)
    // In Docker, services communicate via service names, not localhost
    let usrManagBase = process.env.USR_MANAG_SERVICE_URL || process.env.USR_MANAG_URL || 'http://usr-manag:4000';
    
    // Ensure it's a full URL
    if (!usrManagBase.startsWith('http://') && !usrManagBase.startsWith('https://')) {
      usrManagBase = `http://${usrManagBase}`;
    }

    // Proxy MinIO presigned URLs to avoid CORS issues
    // Use service name in Docker, localhost when running locally
    const minioUrl = process.env.MINIO_SERVICE_URL || 'http://minio:9000';

    return [
      // Media endpoints
      {
        source: '/media/avatar/me',
        destination: `${usrManagBase}/me/avatar`,
      },
      {
        source: '/media/avatar/users/:id',
        destination: `${usrManagBase}/users/:id/avatar`,
      },
      {
        source: '/media/minio/:path*',
        destination: `${minioUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
