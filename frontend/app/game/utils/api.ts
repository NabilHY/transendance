// API helper functions for game authentication and stats

// Helper function to get the correct host (works with localhost, 127.0.0.1, or any IP)
export const getApiHost = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

// API URL builders
export const getAuthBackendUrl = () => {
  // Prod: use nginx public origin when provided
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Dev: direct to auth-backend port
  return `http://${getApiHost()}:8005`;
};
export const getGameBackendUrl = () => {
  // Prod: use nginx public origin and let it route /api/game/*
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
    return `${process.env.NEXT_PUBLIC_BASE_URL}/api/game`;
  }
  // Dev: direct to game-backend port
  return `http://${getApiHost()}:4322`;
};

export interface GameTokenResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name?: string;
    email?: string;
  };
}

/**
 * Get authentication token from auth backend for game access
 */
export const getAuthToken = async (): Promise<string | null> => {
  console.log('🔍 Checking authentication with auth backend...');
  
  try {
    let response = await fetch(`${getAuthBackendUrl()}/api/game-token`, {
      method: 'GET',
      credentials: 'include', // Include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // If we get 401, try to refresh token first
    if (response.status === 401) {
      console.log('🔄 getAuthToken: Got 401, attempting token refresh...');
      const refreshToken = typeof document !== 'undefined' 
        ? document.cookie.split(';').find(cookie => cookie.trim().startsWith('refreshToken='))
        : null;
      
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${getAuthBackendUrl()}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          
          if (refreshRes.ok) {
            console.log('✅ getAuthToken: Token refreshed successfully, retrying...');
            // Retry the original request
            response = await fetch(`${getAuthBackendUrl()}/api/game-token`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            });
          } else {
            console.log('❌ getAuthToken: Token refresh failed');
          }
        } catch (refreshError) {
          console.log('💥 getAuthToken: Error during token refresh:', refreshError);
        }
      }
    }

    if (response.ok) {
      const data: GameTokenResponse = await response.json();
      console.log('✅ Got token from auth backend:', data.user);
      return data.token;
    } else {
      const error = await response.json().catch(() => ({}));
      console.log('❌ Failed to get token from auth backend:', response.status, error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error calling auth backend:', error);
    return null;
  }
};

/**
 * Fetch player statistics from game backend with automatic token refresh
 */
export const fetchPlayerStats = async (
  getToken: () => Promise<string | null>,
  setStats: (stats: any) => void,
  setError: (error: string | null) => void
): Promise<void> => {
  try {
    const token = await getToken();
    if (!token) {
      console.log('❌ No token available for stats fetch');
      return;
    }

    const makeRequest = async (authToken: string) => {
      return await fetch(`${getGameBackendUrl()}/api/player-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
    };

    let response = await makeRequest(token);

    // If we get 401, try to refresh token and retry
    if (response.status === 401) {
      console.log('🔄 Token expired, attempting to refresh...');
      try {
        const refreshResponse = await fetch(`${getAuthBackendUrl()}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          console.log('✅ Token refreshed successfully, retrying stats request...');
          const newToken = await getToken();
          if (newToken) {
            response = await makeRequest(newToken);
          } else {
            console.log('❌ Could not get new token after refresh');
            return;
          }
        } else {
          console.log('❌ Token refresh failed');
          return;
        }
      } catch (refreshError) {
        console.log('💥 Error during token refresh:', refreshError);
        return;
      }
    }

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Got player stats:', data);
      setStats(data.stats);
    } else {
      console.log('❌ Failed to fetch player stats:', response.status);
    }
  } catch (error) {
    console.error('❌ Error fetching player stats:', error);
    setError('Failed to fetch player statistics');
  }
};

