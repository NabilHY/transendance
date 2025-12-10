/**
 * API Configuration utilities for client-side requests
 * These functions dynamically determine the correct API URLs based on the current hostname
 * This allows the app to work with localhost, 127.0.0.1, or any IP address
 */

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
  const hostname = getHostname();
  
  return {
    authBackend: `http://${hostname}:${PORTS.AUTH_BACKEND}`,
    usrManag: `http://${hostname}:${PORTS.USR_MANAG}`,
    chat: `http://${hostname}:${PORTS.CHAT}`,
    frontend: `http://${hostname}:${PORTS.FRONTEND}`,
    gameBackend: `http://${hostname}:${PORTS.GAME_BACKEND}`,
  };
};

// WebSocket URL builder
export const getWsUrl = (port: string, path: string = '/ws'): string => {
  const hostname = getHostname();
  return `ws://${hostname}:${port}${path}`;
};

// Helper to get chat WebSocket URL
export const getChatWsUrl = (userId: string | number): string => {
  return getWsUrl(PORTS.CHAT, `/ws?userId=${userId}`);
};

// Helper to get game WebSocket URL
export const getGameWsUrl = (): string => {
  return getWsUrl(PORTS.GAME_BACKEND, '/ws');
};
