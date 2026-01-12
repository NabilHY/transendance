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
  user: UMUser | null;
  avatarUrl: string | null;
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
  
  // Early return if data is missing
  if (!currentPlayer || !opponent) {
    return (
      <div className={styles.container}>
        <div className={matchReadyStyles.matchReadyContainer}>
          <h1 className={matchReadyStyles.title}>Loading Match...</h1>
        </div>
      </div>
    );
  }
  
  const [currentPlayerData, setCurrentPlayerData] = useState<PlayerCardData>({
    user: null,
    avatarUrl: null,
    loading: true
  });
  const [opponentData, setOpponentData] = useState<PlayerCardData>({
    user: null,
    avatarUrl: null,
    loading: true
  });
  const [countdownValue, setCountdownValue] = useState(countdown);

  // Fetch current player data
  useEffect(() => {
    let cancelled = false;
    
    const fetchPlayerData = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(currentPlayer.id, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          setCurrentPlayerData(prev => ({ ...prev, user: userData }));
          
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
          
          if (!cancelled) {
            setCurrentPlayerData(prev => ({
              ...prev,
              avatarUrl,
              loading: false
            }));
          }
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
  }, [currentPlayer.id, ensureCsrf]);

  // Fetch opponent data
  useEffect(() => {
    let cancelled = false;
    
    const fetchOpponentData = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(opponent.id, csrfToken);
        
        if (cancelled) return;
        
        if (response.ok && response.data) {
          const userData = response.data as UMUser;
          setOpponentData(prev => ({ ...prev, user: userData }));
          
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
          
          if (!cancelled) {
            setOpponentData(prev => ({
              ...prev,
              avatarUrl,
              loading: false
            }));
          }
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
  }, [opponent.id, ensureCsrf]);

  // Countdown timer
  useEffect(() => {
    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownValue]);

  const getRankColor = (rankTier?: string) => {
    if (!rankTier) return '#8c96b6';
    const tier = rankTier.toLowerCase();
    if (tier.includes('bronze')) return '#cd7f32';
    if (tier.includes('silver')) return '#c0c0c0';
    if (tier.includes('gold')) return '#ffd700';
    if (tier.includes('platinum')) return '#e5e4e2';
    if (tier.includes('diamond')) return '#b9f2ff';
    if (tier.includes('master')) return '#ff6b9d';
    if (tier.includes('grandmaster')) return '#ff4b7d';
    return '#8c96b6';
  };

  return (
    <div className={styles.container}>
      <div className={matchReadyStyles.matchReadyContainer}>
        {/* Header */}
        <div className={matchReadyStyles.header}>
          <h1 className={matchReadyStyles.title}>🎮 MATCH FOUND!</h1>
          <p className={matchReadyStyles.subtitle}>Get ready to play</p>
        </div>

        {/* VS Section */}
        <div className={matchReadyStyles.vsSection}>
          {/* Current Player Card */}
          <div className={matchReadyStyles.playerCard}>
            <div className={matchReadyStyles.playerAvatarContainer}>
              {currentPlayerData.loading ? (
                <div className={matchReadyStyles.avatarSkeleton}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              ) : currentPlayerData.avatarUrl ? (
                <img
                  src={currentPlayerData.avatarUrl}
                  alt={currentPlayer.username}
                  className={matchReadyStyles.playerAvatar}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className={matchReadyStyles.avatarPlaceholder}>
                  {getInitials({
                    id: currentPlayer.id,
                    username: currentPlayer.username,
                    first_name: currentPlayerData.user?.first_name,
                    last_name: currentPlayerData.user?.last_name
                  })}
                </div>
              )}
              <div className={matchReadyStyles.playerLabel}>YOU</div>
            </div>
            
            <div className={matchReadyStyles.playerInfo}>
              <h2 className={matchReadyStyles.playerName}>{currentPlayer.username}</h2>
              {currentPlayerData.user && (
                <>
                  <p className={matchReadyStyles.playerFullName}>
                    {currentPlayerData.user.first_name || ''} {currentPlayerData.user.last_name || ''}
                  </p>
                  <div 
                    className={matchReadyStyles.playerRank}
                    style={{ color: getRankColor(currentPlayer.rank) }}
                  >
                    {currentPlayer.rank || 'Bronze'}
                  </div>
                  {currentPlayer.rankPoints !== undefined && (
                    <div className={matchReadyStyles.playerPoints}>
                      {currentPlayer.rankPoints} RP
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* VS Badge */}
          <div className={matchReadyStyles.vsBadge}>
            <div className={matchReadyStyles.vsText}>VS</div>
            {countdownValue > 0 && (
              <div className={matchReadyStyles.countdown}>{countdownValue}</div>
            )}
          </div>

          {/* Opponent Card */}
          <div className={matchReadyStyles.playerCard}>
            <div className={matchReadyStyles.playerAvatarContainer}>
              {opponentData.loading ? (
                <div className={matchReadyStyles.avatarSkeleton}>
                  <div className={styles.loadingSpinner}></div>
                </div>
              ) : opponentData.avatarUrl ? (
                <img
                  src={opponentData.avatarUrl}
                  alt={opponent.username}
                  className={matchReadyStyles.playerAvatar}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className={matchReadyStyles.avatarPlaceholder}>
                  {getInitials({
                    id: opponent.id,
                    username: opponent.username,
                    first_name: opponentData.user?.first_name,
                    last_name: opponentData.user?.last_name
                  })}
                </div>
              )}
              <div className={matchReadyStyles.playerLabel}>OPPONENT</div>
            </div>
            
            <div className={matchReadyStyles.playerInfo}>
              <h2 className={matchReadyStyles.playerName}>{opponent.username}</h2>
              {opponentData.user && (
                <>
                  <p className={matchReadyStyles.playerFullName}>
                    {opponentData.user.first_name || ''} {opponentData.user.last_name || ''}
                  </p>
                  <div 
                    className={matchReadyStyles.playerRank}
                    style={{ color: getRankColor(opponent.rankTier) }}
                  >
                    {opponent.rankTier || 'Bronze'}
                  </div>
                  {opponent.level !== undefined && (
                    <div className={matchReadyStyles.playerPoints}>
                      Level {opponent.level}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className={matchReadyStyles.footer}>
          <div className={matchReadyStyles.readyIndicator}>
            <span className={matchReadyStyles.readyDot}></span>
            <span>Match starting...</span>
          </div>
        </div>
      </div>
    </div>
  );
};
