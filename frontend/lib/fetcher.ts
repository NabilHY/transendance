import { getApiUrls } from './api-config';

export async function fetchCurrentUser() {
  // console.log("url --> ", process.env.NEXT_PUBLIC_USR_MANAG_URL);
  try {
    // Prefer explicit NEXT_PUBLIC_USR_MANAG_URL when provided; otherwise fall back to dynamic hostname+port.
    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    let res = await fetch(`${base}/me`, {
      method: "GET",
      credentials: "include",
    });

    // If we get 401, try to refresh token first
    if (res.status === 401) {
      console.log('🔄 fetchCurrentUser: Got 401, attempting token refresh...');
      const refreshToken = typeof document !== 'undefined' 
        ? document.cookie.split(';').find(cookie => cookie.trim().startsWith('refreshToken='))
        : null;
      
      if (refreshToken) {
        try {
          const apiBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL
            ? process.env.NEXT_PUBLIC_BASE_URL
            : typeof window !== 'undefined'
            ? `http://${window.location.hostname}:8005`
            : 'http://localhost:8005';
          
          const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          
          if (refreshRes.ok) {
            console.log('✅ fetchCurrentUser: Token refreshed successfully, retrying...');
            // Retry the original request
            res = await fetch(`${base}/me`, {
              method: "GET",
              credentials: "include",
            });
          } else {
            console.log('❌ fetchCurrentUser: Token refresh failed');
          }
        } catch (refreshError) {
          console.log('💥 fetchCurrentUser: Error during token refresh:', refreshError);
        }
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("User not authenticated");
        return null;
      }
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch current user:", err);
    return null;
  }
}

export async function getUserData(id: string) {

  

}
