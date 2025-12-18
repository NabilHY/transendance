// Custom hook for game authentication

import { useState, useEffect } from 'react';
import { getAuthToken, fetchPlayerStats } from '../utils/api';
import type { PlayerInfo, PlayerStats } from '../types';

interface UseGameAuthReturn {
  token: string | null;
  playerInfo: PlayerInfo | null;
  playerStats: PlayerStats | null;
  isAuthenticated: boolean;
  authError: string | null;
  isLoading: boolean;
  refreshStats: () => Promise<void>;
}

export const useGameAuth = (isLoggedIn: boolean, authLoading: boolean): UseGameAuthReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getToken = async (): Promise<string | null> => {
    const authToken = await getAuthToken();
    if (authToken) {
      setToken(authToken);
      return authToken;
    }
    return null;
  };

  const refreshStats = async () => {
    await fetchPlayerStats(getToken, setPlayerStats, setAuthError);
  };

  useEffect(() => {
    if (!isLoggedIn || authLoading) return;
    
    const checkAuth = async () => {
      setIsLoading(true);
      const authToken = await getAuthToken();
      
      if (authToken) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8005'}/api/game-token`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            setPlayerInfo({ user: data.user, username: data.user.username });
            setIsAuthenticated(true);
            setAuthError(null);
            await refreshStats();
          }
        } catch (error) {
          console.error('Error getting user info:', error);
        }
      } else {
        setIsAuthenticated(false);
        setAuthError('Please log in to play the game.');
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [isLoggedIn, authLoading]);

  return {
    token,
    playerInfo,
    playerStats,
    isAuthenticated,
    authError,
    isLoading,
    refreshStats
  };
};

