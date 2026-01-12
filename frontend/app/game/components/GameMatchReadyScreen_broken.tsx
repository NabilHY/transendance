// Match Ready Screen - Shows both players with avatars and stats before game starts

import React, { useEffect, useState } from 'react';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';
import { umGetUser, type UMUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { PlayerInfo } from '../types';
import styles from '../styles.module.css';
import matchReadyStyles from './MatchReadyScreen.module.css';

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
  
  // Extract current player and opponent from playerInfo
  const currentPlayer = playerInfo.user;
  const opponent = playerInfo.opponent;
  
  console.log('GameMatchReadyScreen - playerInfo:', playerInfo);
  console.log('GameMatchReadyScreen - currentPlayer:', currentPlayer);
  console.log('GameMatchReadyScreen - opponent:', opponent);
  
  // Early return if data is missing
  if (!currentPlayer || !opponent) {
    console.log('Missing player data!');
    return (
      <div className={styles.container}>
        <div className={matchReadyStyles.matchReadyContainer}>
          <h1 className={matchReadyStyles.title}>Loading Match...</h1>
        </div>
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
    if (!playerId) {
      console.log('No current player ID');
      return;
    }
    
    let cancelled = false;
    
    const fetchPlayerData = async () => {
      try {
        console.log('Fetching current player data for ID:', playerId);
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(playerId, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          console.log('Current player data fetched:', userData);
          
          // Fetch avatar
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
            level: userData.level || 1,
            rankTier: userData.rankTier || 'Bronze',
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
    if (!opponentId) {
      console.log('No opponent ID');
      return;
    }
    
    let cancelled = false;
    
    const fetchOpponentData = async () => {
      try {
        console.log('Fetching opponent data for ID:', opponentId);
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(opponentId, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          console.log('Opponent data fetched:', userData);
          
          // Fetch avatar
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
            level: userData.level || 1,
            rankTier: userData.rankTier || 'Bronze',
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
    if (data.loading) {
      return (
        <div className={matchReadyStyles.playerCard}>
          <div className={matchReadyStyles.loadingSpinner}></div>
        </div>
      );
    }

    const initials = getInitials(data.username, '', '');

    return (
      <div className={matchReadyStyles.playerCard}>
        <div className={matchReadyStyles.playerLabel}>{label}</div>
        <div className={matchReadyStyles.avatarContainer}>
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.username}
              className={matchReadyStyles.playerAvatar}
            />
          ) : (
            <div className={matchReadyStyles.playerAvatarPlaceholder}>
              {initials}
            </div>
          )}
        </div>
        <div className={matchReadyStyles.playerName}>{data.username}</div>
        <div 
          className={matchReadyStyles.playerRank}
          style={{ color: getRankColor(data.rankTier) }}
        >
          {data.rankTier} • Level {data.level}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={matchReadyStyles.matchReadyContainer}>
        <h1 className={matchReadyStyles.title}>Match Ready!</h1>
        
        <div className={matchReadyStyles.playersContainer}>
          {renderPlayerCard(currentPlayerData, "You")}
          
          <div className={matchReadyStyles.vsContainer}>
            <div className={matchReadyStyles.vsText}>VS</div>
          </div>
          
          {renderPlayerCard(opponentData, "Opponent")}
        </div>
        
        {countdownValue > 0 && (
          <div className={matchReadyStyles.countdown}>
            {countdownValue}
          </div>
        )}
        
        <div className={matchReadyStyles.startingText}>
          Game starting{countdownValue > 0 ? ` in ${countdownValue}...` : '...'}
        </div>
      </div>
    </div>
  );
};
