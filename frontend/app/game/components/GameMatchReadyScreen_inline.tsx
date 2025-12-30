// Match Ready Screen - Inline Styles Version (No CSS modules)

import React, { useEffect, useState } from 'react';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';
import { umGetUser, type UMUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { PlayerInfo } from '../types';

interface MatchReadyScreenProps {
  playerInfo: PlayerInfo;
  countdown?: number;
}

interface PlayerCardData {
  username: string;
  avatarUrl: string | null;
  level: number;
  rankTier: string;
  loading: boolean;
}

export const GameMatchReadyScreen: React.FC<MatchReadyScreenProps> = ({
  playerInfo,
  countdown = 3
}) => {
  const { ensureCsrf } = useAuth();
  
  const currentPlayer = playerInfo.user;
  const opponent = playerInfo.opponent;
  
  console.log('GameMatchReadyScreen - playerInfo:', playerInfo);
  
  if (!currentPlayer || !opponent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'rgba(12, 20, 35, 0.95)',
        color: '#ffffff',
        fontSize: '24px'
      }}>
        Loading Match...
      </div>
    );
  }
  
  const [currentPlayerData, setCurrentPlayerData] = useState<PlayerCardData>({
    username: currentPlayer.username || '',
    avatarUrl: null,
    level: 1,
    rankTier: 'Bronze',
    loading: true
  });
  
  const [opponentData, setOpponentData] = useState<PlayerCardData>({
    username: opponent.username || '',
    avatarUrl: null,
    level: opponent.level || 1,
    rankTier: opponent.rankTier || 'Bronze',
    loading: true
  });
  
  const [countdownValue, setCountdownValue] = useState(countdown);

  // Fetch current player data
  useEffect(() => {
    const playerId = currentPlayer?.id;
    if (!playerId) return;
    
    let cancelled = false;
    
    const fetchPlayerData = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(playerId, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          
          const userWithAvatar: UserWithAvatar = {
            id: userData.id,
            profile_pic: userData.profile_pic,
            avatar_updated_at: userData.avatar_updated_at,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
          };
          
          const avatarUrl = await getAvatarUrl(userWithAvatar, {
            isCurrentUser: true,
            useCache: true
          });
          
          setCurrentPlayerData({
            username: userData.username,
            avatarUrl: avatarUrl || null,
            level: (userData as any).level || 1,
            rankTier: (userData as any).rankTier || 'Bronze',
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching current player data:', error);
        if (!cancelled) {
          setCurrentPlayerData(prev => ({ ...prev, loading: false }));
        }
      }
    };
    
    fetchPlayerData();
    return () => { cancelled = true; };
  }, [currentPlayer?.id, ensureCsrf]);

  // Fetch opponent data
  useEffect(() => {
    const opponentId = opponent?.id;
    if (!opponentId) return;
    
    let cancelled = false;
    
    const fetchOpponentData = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(opponentId, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          
          const userWithAvatar: UserWithAvatar = {
            id: userData.id,
            profile_pic: userData.profile_pic,
            avatar_updated_at: userData.avatar_updated_at,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
          };
          
          const avatarUrl = await getAvatarUrl(userWithAvatar, {
            isCurrentUser: false,
            useCache: true
          });
          
          setOpponentData({
            username: userData.username,
            avatarUrl: avatarUrl || null,
            level: (userData as any).level || 1,
            rankTier: (userData as any).rankTier || 'Bronze',
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching opponent data:', error);
        if (!cancelled) {
          setOpponentData(prev => ({ ...prev, loading: false }));
        }
      }
    };
    
    fetchOpponentData();
    return () => { cancelled = true; };
  }, [opponent?.id, ensureCsrf]);

  // Countdown timer
  useEffect(() => {
    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownValue]);

  const getRankColor = (rankTier: string) => {
    const colors: { [key: string]: string } = {
      'Bronze': '#CD7F32',
      'Silver': '#C0C0C0',
      'Gold': '#FFD700',
      'Platinum': '#E5E4E2',
      'Diamond': '#B9F2FF',
      'Master': '#9D4EDD',
      'Grandmaster': '#FF0080'
    };
    return colors[rankTier] || '#888';
  };

  const renderPlayerCard = (data: PlayerCardData, label: string) => {
    const initials = data.username.substring(0, 2).toUpperCase();

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        padding: '40px 30px',
        background: 'rgba(20, 28, 48, 0.9)',
        borderRadius: '20px',
        border: '2px solid #2a3450',
        minWidth: '250px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#8c96b6',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {label}
        </div>
        
        {data.loading ? (
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(47, 140, 255, 0.2)',
            borderTopColor: '#2f8cff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <>
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={data.username}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #2f8cff',
                  boxShadow: '0 0 20px rgba(47, 140, 255, 0.3)'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2f8cff 0%, #536dfe 100%)',
                border: '4px solid #2f8cff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: 700,
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(47, 140, 255, 0.3)'
              }}>
                {initials}
              </div>
            )}
            
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              margin: 0
            }}>
              {data.username}
            </div>
            
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              textAlign: 'center',
              margin: 0,
              color: getRankColor(data.rankTier)
            }}>
              {data.rankTier} • Level {data.level}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '40px 20px',
      background: 'rgba(12, 20, 35, 0.95)'
    }}>
      <h1 style={{
        fontSize: '48px',
        fontWeight: 800,
        color: '#ffffff',
        marginBottom: '60px',
        textAlign: 'center',
        textShadow: '0 0 20px rgba(47, 140, 255, 0.5)'
      }}>
        Match Ready!
      </h1>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '80px',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {renderPlayerCard(currentPlayerData, "You")}
        
        <div style={{
          fontSize: '36px',
          fontWeight: 900,
          color: '#ff6b9d',
          textShadow: '0 0 10px rgba(255, 107, 157, 0.5)',
          background: 'rgba(255, 107, 157, 0.1)',
          border: '2px solid rgba(255, 107, 157, 0.3)',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          VS
        </div>
        
        {renderPlayerCard(opponentData, "Opponent")}
      </div>
      
      {countdownValue > 0 && (
        <div style={{
          fontSize: '64px',
          fontWeight: 900,
          color: '#2f8cff',
          margin: '20px 0',
          textShadow: '0 0 30px rgba(47, 140, 255, 0.8)'
        }}>
          {countdownValue}
        </div>
      )}
      
      <div style={{
        fontSize: '20px',
        color: '#8c96b6',
        fontWeight: 500,
        marginTop: '10px'
      }}>
        Game starting{countdownValue > 0 ? ` in ${countdownValue}...` : '...'}
      </div>
    </div>
  );
};
