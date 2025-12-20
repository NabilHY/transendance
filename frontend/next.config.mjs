/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  async rewrites() {
    // Get usr-manag URL from env or default to localhost:4000
    // Supports both full URL (http://host:port) and host:port format
    let usrManagBase = process.env.USR_MANAG_URL || 'http://localhost:4000';
    if (!usrManagBase.startsWith('http://') && !usrManagBase.startsWith('https://')) {
      usrManagBase = `http://${usrManagBase}`;
    }

    return [
      {
        source: '/media/avatar/me',
        destination: `${usrManagBase}/me/avatar`,
      },
      {
        source: '/media/avatar/users/:id',
        destination: `${usrManagBase}/users/:id/avatar`,
      },
    ];
  },
};

export default nextConfig;


