/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
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
