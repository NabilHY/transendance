/**
 * API Configuration utilities for client-side requests
 * These functions dynamically determine the correct API URLs based on the current hostname
 * This allows the app to work with localhost, 127.0.0.1, or any IP address
 */

// Base origins supplied via env for prod HTTPS
export const API_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || '';
export const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_URL || '';

// Get the current hostname (works in browser only)
export const getHostname = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost'; // Fallback for SSR
};

// Port constants
export const PORTS = {
  AUTH_BACKEND: process.env.NEXT_PUBLIC_AUTH_PORT || '8005',
  USR_MANAG: process.env.NEXT_PUBLIC_USR_MANAG_PORT || '4000',
  CHAT: process.env.NEXT_PUBLIC_CHAT_PORT || '8006',
  FRONTEND: process.env.NEXT_PUBLIC_FRONTEND_PORT || '3010',
  GAME_BACKEND: process.env.NEXT_PUBLIC_GAME_BACKEND_PORT || '4322',
};

// API URL builders for client-side requests
export const getApiUrls = () => {
  // In production (NEXT_PUBLIC_BASE_URL defined), construct URLs from it
  if (API_ORIGIN) {
    return {
      authBackend: `${API_ORIGIN}/api/auth`,
      usrManag: `${API_ORIGIN}/api/users`,
      chat: `${API_ORIGIN}/api/chat`,
      frontend: `${API_ORIGIN}`,
      gameBackend: `${API_ORIGIN}/api/game`,
    };
  }

  // Fallback for dev – build from current hostname
  const hostname = getHostname();
  const protocol = typeof window !== 'undefined' ? window.location.protocol.replace(':', '') : 'http';
  return {
    authBackend: `${protocol}://${hostname}:${PORTS.AUTH_BACKEND}`,
    usrManag: `${protocol}://${hostname}:${PORTS.USR_MANAG}`,
    chat: `${protocol}://${hostname}:${PORTS.CHAT}`,
    frontend: `${protocol}://${hostname}:${PORTS.FRONTEND}`,
    gameBackend: `${protocol}://${hostname}:${PORTS.GAME_BACKEND}`,
  };
};

// Helper to get user management API base URL
export const getUserMgmtBase = (): string => {
  const urls = getApiUrls();
  return urls.usrManag;
};

// WebSocket URL builder
export const getWsUrl = (port: string, path: string = '/ws'): string => {
  if (WS_ORIGIN) {
    return `${WS_ORIGIN}${path}`;
  }
  const hostname = getHostname();
  const scheme = window?.location?.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${hostname}:${port}${path}`;
};

// Helper to get chat WebSocket URL
export const getChatWsUrl = (userId: string | number): string => {
  // Production: Use NEXT_PUBLIC_WS_URL or NEXT_PUBLIC_BASE_URL (behind nginx)
  if (WS_ORIGIN) {
    return `${WS_ORIGIN}/api/chat/ws?userId=${userId}`;
  }
  
  // Check if NEXT_PUBLIC_BASE_URL is set (production behind nginx)
  if (API_ORIGIN) {
    // Use HTTPS base URL, convert to WSS
    const baseUrl = API_ORIGIN.replace(/^http/, 'ws');
    return `${baseUrl}/api/chat/ws?userId=${userId}`;
  }

  // Development: Connect directly to chat backend
  return getWsUrl(PORTS.CHAT, `/ws?userId=${userId}`);
};

// Helper to get game WebSocket URL
export const getGameWsUrl = (): string => {
  return getWsUrl(PORTS.GAME_BACKEND, '/ws');
};
