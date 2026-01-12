// Match Ready Screen - Cohesive Game Frontend Design

import React, { useState, useEffect } from 'react';
import { getAvatarUrl, type UserWithAvatar } from '@/lib/avatar';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { umGetUser, type UMUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Swords } from 'lucide-react';
import type { PlayerInfo } from '../types';

interface MatchReadyScreenProps {
  playerInfo: PlayerInfo;
}

export const GameMatchReadyScreen: React.FC<MatchReadyScreenProps> = ({ playerInfo }) => {
  const { ensureCsrf } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [currentPlayerAvatar, setCurrentPlayerAvatar] = useState<string | null>(null);
  const [opponentAvatar, setOpponentAvatar] = useState<string | null>(null);
  const [isWideScreen, setIsWideScreen] = useState(true);

  // Check screen width for responsive layout
  useEffect(() => {
    const checkWidth = () => {
      setIsWideScreen(window.innerWidth > 900);
    };
    
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Mark as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPlayer = playerInfo.user;
  const opponent = playerInfo.opponent;
  const isQuadMode = playerInfo.gameType === 'quad';

  console.log('🎮 GameMatchReadyScreen - Full playerInfo:', JSON.stringify(playerInfo, null, 2));
  console.log('🎮 GameMatchReadyScreen - currentPlayer:', currentPlayer);
  console.log('🎮 GameMatchReadyScreen - opponent:', opponent);

  // Fetch current player avatar (only for 1v1)
  useEffect(() => {
    if (!currentPlayer?.id || isQuadMode) return;
    
    const fetchAvatar = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(currentPlayer.id, csrfToken);
        
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
          
          if (avatarUrl) setCurrentPlayerAvatar(avatarUrl);
        }
      } catch (error) {
        console.error('Error fetching current player avatar:', error);
      }
    };
    
    fetchAvatar();
  }, [currentPlayer?.id, ensureCsrf]);

  // Fetch opponent avatar (only for 1v1)
  useEffect(() => {
    if (!opponent?.id || isQuadMode) return;
    
    const fetchAvatar = async () => {
      try {
        const csrfToken = await ensureCsrf();
        const response = await umGetUser(opponent.id, csrfToken);
        
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
          
          if (avatarUrl) setOpponentAvatar(avatarUrl);
        }
      } catch (error) {
        console.error('Error fetching opponent avatar:', error);
      }
    };
    
    fetchAvatar();
  }, [opponent?.id, ensureCsrf]);

  const getRankColor = (rankTier?: string) => {
    const colors: Record<string, string> = {
      Bronze: '#ff6b35',
      Silver: '#c0c0c0',
      Gold: '#ffc107',
      Platinum: '#00fff2',
      Diamond: '#00f0ff',
      Master: '#b744ff',
      Grandmaster: '#ff006e'
    };
    return colors[rankTier || 'Bronze'] || '#00f0ff';
  };

  const getRankGlow = (rankTier?: string) => {
    const color = getRankColor(rankTier);
    return `0 0 20px ${color}, 0 0 40px ${color}40`;
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050811 0%, #0a0e1a 100%)',
      padding: 'clamp(16px, 3vw, 32px)',
      position: 'relative' as const,
      overflow: 'hidden'
    },
    backgroundPattern: {
      content: '',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(ellipse at top, rgba(0, 240, 255, 0.08), transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(183, 68, 255, 0.08), transparent 50%),
        repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.03) 0px, transparent 2px, transparent 4px),
        repeating-linear-gradient(90deg, rgba(183, 68, 255, 0.03) 0px, transparent 2px, transparent 4px)
      `,
      pointerEvents: 'none' as const,
      zIndex: 0
    },
    title: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 'clamp(24px, 5vw, 40px)',
      fontWeight: 800,
      color: '#e8f0ff',
      marginBottom: 'clamp(20px, 4vh, 32px)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.15em',
      textShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(183, 68, 255, 0.4)',
      background: 'linear-gradient(135deg, #00f0ff 0%, #b744ff 50%, #ff006e 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'shimmer 3s ease-in-out infinite',
      textAlign: 'center' as const,
      zIndex: 1
    },
    playersContainer: {
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: 'clamp(16px, 3vw, 32px)',
      marginBottom: 'clamp(16px, 3vh, 24px)',
      width: '100%',
      maxWidth: '900px',
      zIndex: 1,
      flexDirection: isWideScreen ? ('row' as const) : ('column' as const),
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    playerCard: (isLeft: boolean) => ({
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: 'clamp(12px, 2vw, 16px)',
      padding: 'clamp(16px, 2.5vw, 24px)',
      background: 'rgba(15, 20, 35, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      minWidth: 'clamp(180px, 25vw, 260px)',
      maxWidth: '320px',
      boxShadow: `
        0 0 30px rgba(0, 240, 255, 0.1),
        0 0 60px rgba(183, 68, 255, 0.05),
        inset 0 0 30px rgba(0, 240, 255, 0.03)
      `,
      position: 'relative' as const,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: `${isLeft ? 'slideInLeft' : 'slideInRight'} 0.6s cubic-bezier(0.4, 0, 0.2, 1)`
    }),
    label: (color: string) => ({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 'clamp(10px, 1.6vw, 12px)',
      fontWeight: 700,
      color,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      textShadow: `0 0 10px ${color}80`,
      marginBottom: '2px',
      zIndex: 1
    }),
    avatar: (bgGradient: string, borderColor: string, boxShadow: string) => ({
      width: 'clamp(100px, 16vw, 130px)',
      height: 'clamp(100px, 16vw, 130px)',
      borderRadius: '50%',
      background: bgGradient,
      border: `3px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 'clamp(36px, 6vw, 48px)',
      fontWeight: 900,
      color: '#FFFFFF',
      boxShadow,
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 20px rgba(255, 255, 255, 0.3)',
      letterSpacing: '2px',
      zIndex: 1,
      WebkitTextStroke: '1px rgba(0, 0, 0, 0.3)'
    }),
    username: (textShadow: string) => ({
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: 'clamp(16px, 3.5vw, 22px)',
      fontWeight: 700,
      color: '#e8f0ff',
      textShadow,
      marginTop: '4px',
      zIndex: 1
    }),
    rank: (color: string) => ({
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: 'clamp(12px, 2.2vw, 14px)',
      fontWeight: 600,
      color: color,
      textShadow: `0 0 8px ${color}60`,
      opacity: 0.9,
      zIndex: 1
    }),
    vsBadge: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 'clamp(20px, 4vw, 28px)',
      fontWeight: 900,
      color: '#b744ff',
      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(183, 68, 255, 0.15))',
      backdropFilter: 'blur(20px)',
      border: '2px solid rgba(183, 68, 255, 0.4)',
      borderRadius: '50%',
      width: 'clamp(60px, 10vw, 90px)',
      height: 'clamp(60px, 10vw, 90px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textShadow: '0 0 20px rgba(183, 68, 255, 0.8), 0 0 40px rgba(183, 68, 255, 0.4)',
      boxShadow: `
        0 0 30px rgba(183, 68, 255, 0.3),
        inset 0 0 30px rgba(183, 68, 255, 0.1)
      `,
      animation: 'spin 4s linear infinite, pulse 2s ease-in-out infinite',
      zIndex: 2,
      flexShrink: 0,
      transform: isWideScreen ? 'rotate(0deg)' : 'rotate(90deg)',
      transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    startingText: {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: 'clamp(14px, 2.5vw, 18px)',
      color: '#8c96b6',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textAlign: 'center' as const,
      textShadow: '0 0 10px rgba(140, 150, 182, 0.4)',
      marginTop: 'clamp(12px, 2vh, 20px)',
      zIndex: 1
    }
  };

  // Early returns after styles are defined
  if (!currentPlayer) {
    return <div style={{ color: '#fff', fontSize: '24px', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
  }

  // For quad mode, show simplified screen
  if (isQuadMode) {
    // Determine team sides: team1 = left, team2 = right
    const currentPlayerTeam = playerInfo.team; // 'team1' or 'team2'
    const isTeam1 = currentPlayerTeam === 'team1';
    
    // Get teammates and opponents based on team
    const teammate = playerInfo.teammates && playerInfo.teammates.length > 0 ? playerInfo.teammates[0] : null;
    const opponent1 = playerInfo.opponents && playerInfo.opponents.length >= 1 ? playerInfo.opponents[0] : null;
    const opponent2 = playerInfo.opponents && playerInfo.opponents.length >= 2 ? playerInfo.opponents[1] : null;
    
    // Determine which side to show your team (always match paddle side)
    // Team1 = LEFT side (blue), Team2 = RIGHT side (green)
    
    return (
      <div style={styles.container}>
        <div style={styles.backgroundPattern} />
        
        <h1 style={styles.title}>2v2 Battle!</h1>
        
        <div style={{
          display: 'flex',
          flexDirection: isWideScreen ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isWideScreen ? '48px' : '24px',
          width: '100%',
          maxWidth: '1000px',
          zIndex: 1,
          marginBottom: '32px'
        }}>
          {/* LEFT SIDE - Team 1 (Blue) */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: 'clamp(24px, 3vw, 32px)',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(15, 20, 35, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: isTeam1 ? '2px solid rgba(0, 240, 255, 0.6)' : '2px solid rgba(0, 240, 255, 0.3)',
            minWidth: '280px',
            maxWidth: '400px',
            boxShadow: isTeam1 ? `
              0 0 40px rgba(0, 240, 255, 0.4),
              0 8px 32px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            ` : `
              0 0 20px rgba(0, 240, 255, 0.2),
              0 8px 32px rgba(0, 0, 0, 0.4)
            `,
            animation: 'slideInLeft 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative' as const,
            overflow: 'hidden'
          }}>
            {/* Team glow effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
              animation: 'pulse 3s ease-in-out infinite'
            }} />
            
            <div style={{
              ...styles.label('#00f0ff'),
              fontSize: 'clamp(14px, 2vw, 16px)',
              letterSpacing: '0.2em',
              padding: '8px 20px',
              background: isTeam1 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 240, 255, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              zIndex: 1
            }}>{isTeam1 ? 'YOUR TEAM (LEFT)' : 'OPPONENT TEAM (LEFT)'}</div>
            
            {/* Show your team or opponent team based on who's on team1 */}
            {isTeam1 ? (
              <>
                {/* Current player */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      padding: '4px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00f0ff, #0088cc)',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(0, 240, 255, 0.4)'
                    }}>
                      <PlayerAvatar 
                        user={currentPlayer} 
                        size="large"
                      />
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00f0ff, #00a8ff)',
                      border: '2px solid #0a0e1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: '0 0 12px rgba(0, 240, 255, 0.6)'
                    }}>★</div>
                  </div>
                  <div style={{
                    fontSize: 'clamp(20px, 3.5vw, 28px)',
                    fontWeight: 800,
                    color: '#00f0ff',
                    textAlign: 'center',
                    textShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
                    letterSpacing: '0.05em'
                  }}>
                    {currentPlayer?.username || 'You'}
                  </div>
                  <div style={{
                    fontSize: 'clamp(12px, 2vw, 14px)',
                    color: '#8cd5ff',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em'
                  }}>
                    YOU
                  </div>
                </div>

                {/* Teammate */}
                {teammate && (
                  <>
                    <div style={{
                      width: '80%',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.3), transparent)',
                      zIndex: 1
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0.9,
                      zIndex: 1
                    }}>
                      <PlayerAvatar 
                        user={teammate} 
                        size="medium"
                      />
                      <div style={{
                        fontSize: 'clamp(16px, 3vw, 22px)',
                        fontWeight: 700,
                        color: '#8cd5ff',
                        textAlign: 'center',
                        letterSpacing: '0.05em'
                      }}>
                        {teammate?.username || 'Teammate'}
                      </div>
                      <div style={{
                        fontSize: 'clamp(11px, 1.8vw, 13px)',
                        color: '#6ba8cc',
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em'
                      }}>
                        Teammate
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Opponent team players */}
                {opponent1 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 1
                  }}>
                    <div style={{
                      padding: '4px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00f0ff, #0088cc)',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
                    }}>
                      <PlayerAvatar 
                        user={opponent1} 
                        size="large"
                      />
                    </div>
                    <div style={{
                      fontSize: 'clamp(20px, 3.5vw, 28px)',
                      fontWeight: 800,
                      color: '#00f0ff',
                      textAlign: 'center',
                      textShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
                      letterSpacing: '0.05em'
                    }}>
                      {opponent1?.username || 'Opponent'}
                    </div>
                  </div>
                )}
                
                {opponent2 && (
                  <>
                    <div style={{
                      width: '80%',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.3), transparent)',
                      zIndex: 1
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0.9,
                      zIndex: 1
                    }}>
                      <PlayerAvatar 
                        user={opponent2} 
                        size="medium"
                      />
                      <div style={{
                        fontSize: 'clamp(16px, 3vw, 22px)',
                        fontWeight: 700,
                        color: '#8cd5ff',
                        textAlign: 'center',
                        letterSpacing: '0.05em'
                      }}>
                        {opponent2?.username || 'Opponent'}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* VS Badge */}
          <div style={{
            ...styles.vsBadge,
            width: 'clamp(60px, 10vw, 80px)',
            height: 'clamp(60px, 10vw, 80px)',
            fontSize: 'clamp(20px, 4vw, 28px)',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #b744ff 0%, #8b2fc9 100%)',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            boxShadow: `
              0 0 40px rgba(183, 68, 255, 0.6),
              0 0 80px rgba(183, 68, 255, 0.3),
              inset 0 2px 8px rgba(255, 255, 255, 0.2)
            `,
            animation: 'spin 4s linear infinite, pulse 2s ease-in-out infinite'
          }}>VS</div>

          {/* RIGHT SIDE - Team 2 (Green) */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: 'clamp(24px, 3vw, 32px)',
            background: 'linear-gradient(135deg, rgba(52, 206, 87, 0.08) 0%, rgba(15, 20, 35, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: !isTeam1 ? '2px solid rgba(52, 206, 87, 0.6)' : '2px solid rgba(52, 206, 87, 0.3)',
            minWidth: '280px',
            maxWidth: '400px',
            boxShadow: !isTeam1 ? `
              0 0 40px rgba(52, 206, 87, 0.4),
              0 8px 32px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            ` : `
              0 0 20px rgba(52, 206, 87, 0.2),
              0 8px 32px rgba(0, 0, 0, 0.4)
            `,
            animation: 'slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative' as const,
            overflow: 'hidden'
          }}>
            {/* Team glow effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(52, 206, 87, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
              animation: 'pulse 3s ease-in-out infinite 0.5s'
            }} />
            
            <div style={{
              ...styles.label('#34ce57'),
              fontSize: 'clamp(14px, 2vw, 16px)',
              letterSpacing: '0.2em',
              padding: '8px 20px',
              background: !isTeam1 ? 'rgba(52, 206, 87, 0.2)' : 'rgba(52, 206, 87, 0.1)',
              borderRadius: '20px',
              border: '1px solid rgba(52, 206, 87, 0.4)',
              zIndex: 1
            }}>{!isTeam1 ? 'YOUR TEAM (RIGHT)' : 'OPPONENT TEAM (RIGHT)'}</div>
            
            {/* Show your team or opponent team based on who's on team2 */}
            {!isTeam1 ? (
              <>
                {/* Current player */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 1
                }}>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      padding: '4px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #34ce57, #28a745)',
                      boxShadow: '0 0 20px rgba(52, 206, 87, 0.6), 0 0 40px rgba(52, 206, 87, 0.4)'
                    }}>
                      <PlayerAvatar 
                        user={currentPlayer} 
                        size="large"
                      />
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #34ce57, #28a745)',
                      border: '2px solid #0a0e1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: '0 0 12px rgba(52, 206, 87, 0.6)'
                    }}>★</div>
                  </div>
                  <div style={{
                    fontSize: 'clamp(20px, 3.5vw, 28px)',
                    fontWeight: 800,
                    color: '#34ce57',
                    textAlign: 'center',
                    textShadow: '0 0 20px rgba(52, 206, 87, 0.6)',
                    letterSpacing: '0.05em'
                  }}>
                    {currentPlayer?.username || 'You'}
                  </div>
                  <div style={{
                    fontSize: 'clamp(12px, 2vw, 14px)',
                    color: '#7dd99d',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em'
                  }}>
                    YOU
                  </div>
                </div>

                {/* Teammate */}
                {teammate && (
                  <>
                    <div style={{
                      width: '80%',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(52, 206, 87, 0.3), transparent)',
                      zIndex: 1
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0.9,
                      zIndex: 1
                    }}>
                      <PlayerAvatar 
                        user={teammate} 
                        size="medium"
                      />
                      <div style={{
                        fontSize: 'clamp(16px, 3vw, 22px)',
                        fontWeight: 700,
                        color: '#7dd99d',
                        textAlign: 'center',
                        letterSpacing: '0.05em'
                      }}>
                        {teammate?.username || 'Teammate'}
                      </div>
                      <div style={{
                        fontSize: 'clamp(11px, 1.8vw, 13px)',
                        color: '#5cb575',
                        fontWeight: 600,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em'
                      }}>
                        Teammate
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Opponent team players */}
                {opponent1 && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 1
                  }}>
                    <div style={{
                      padding: '4px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #34ce57, #28a745)',
                      boxShadow: '0 0 20px rgba(52, 206, 87, 0.4)'
                    }}>
                      <PlayerAvatar 
                        user={opponent1} 
                        size="large"
                      />
                    </div>
                    <div style={{
                      fontSize: 'clamp(20px, 3.5vw, 28px)',
                      fontWeight: 800,
                      color: '#34ce57',
                      textAlign: 'center',
                      textShadow: '0 0 20px rgba(52, 206, 87, 0.4)',
                      letterSpacing: '0.05em'
                    }}>
                      {opponent1?.username || 'Opponent'}
                    </div>
                  </div>
                )}
                
                {opponent2 && (
                  <>
                    <div style={{
                      width: '80%',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(52, 206, 87, 0.3), transparent)',
                      zIndex: 1
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      opacity: 0.9,
                      zIndex: 1
                    }}>
                      <PlayerAvatar 
                        user={opponent2} 
                        size="medium"
                      />
                      <div style={{
                        fontSize: 'clamp(16px, 3vw, 22px)',
                        fontWeight: 700,
                        color: '#7dd99d',
                        textAlign: 'center',
                        letterSpacing: '0.05em'
                      }}>
                        {opponent2?.username || 'Opponent'}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div style={styles.startingText}>
          <Swords style={{ width: '20px', height: '20px', marginRight: '10px' }} />
          Preparing 2v2 battle...
          <Swords style={{ width: '20px', height: '20px', marginLeft: '10px' }} />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.05); }
          }
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
            100% { transform: rotate(360deg) scale(1); }
          }
          @keyframes slideInLeft {
            0% { transform: translateX(-100px) rotate(-10deg); opacity: 0; }
            100% { transform: translateX(0) rotate(0deg); opacity: 1; }
          }
          @keyframes slideInRight {
            0% { transform: translateX(100px) rotate(10deg); opacity: 0; }
            100% { transform: translateX(0) rotate(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // For 1v1 mode
  if (!opponent) {
    return <div style={{ color: '#fff', fontSize: '24px', textAlign: 'center', marginTop: '100px' }}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern} />
      
      {/* Animated particles */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '20%',
        width: '8px',
        height: '8px',
        background: '#00f0ff',
        borderRadius: '50%',
        boxShadow: '0 0 20px #00f0ff',
        animation: 'floatParticle1 4s ease-in-out infinite',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: '15%',
        width: '6px',
        height: '6px',
        background: '#b744ff',
        borderRadius: '50%',
        boxShadow: '0 0 20px #b744ff',
        animation: 'floatParticle2 5s ease-in-out infinite',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '30%',
        width: '10px',
        height: '10px',
        background: '#ff006e',
        borderRadius: '50%',
        boxShadow: '0 0 20px #ff006e',
        animation: 'floatParticle3 6s ease-in-out infinite',
        zIndex: 0
      }} />

      <h1 style={styles.title}>Match Ready!</h1>

      <div style={styles.playersContainer}>
        {/* Left side - Player 1 (always show player1 on left, player2 on right) */}
        {playerInfo.role === 'player1' ? (
          // Current player is player1, show on left
          <div style={styles.playerCard(true)}>
            <div style={styles.label('#00f0ff')}>YOU (LEFT PADDLE)</div>
            <div style={{ 
              width: 'clamp(90px, 16vw, 130px)', 
              height: 'clamp(90px, 16vw, 130px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayerAvatar 
                user={currentPlayer} 
                size="large"
              />
            </div>
            <div style={styles.username('0 0 10px rgba(0, 217, 255, 0.5)')}>
              {currentPlayer.username || 'You'}
            </div>
            <div style={styles.rank('#00d9ff')}>Bronze • Level 1</div>
          </div>
        ) : (
          // Current player is player2, show opponent (player1) on left
          <div style={styles.playerCard(false)}>
            <div style={styles.label(getRankColor(opponent.rankTier))}>OPPONENT (LEFT PADDLE)</div>
            <div style={{ 
              width: 'clamp(90px, 16vw, 130px)', 
              height: 'clamp(90px, 16vw, 130px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayerAvatar 
                user={opponent} 
                size="large"
              />
            </div>
            <div style={styles.username(`0 0 10px ${getRankColor(opponent.rankTier)}50`)}>
              {opponent.username || 'Opponent'}
            </div>
            <div style={styles.rank(getRankColor(opponent.rankTier))}>
              {opponent.rankTier || 'Bronze'} • Level {opponent.level || 1}
            </div>
          </div>
        )}

        <div style={styles.vsBadge}>VS</div>

        {/* Right side - Player 2 (always show player1 on left, player2 on right) */}
        {playerInfo.role === 'player2' ? (
          // Current player is player2, show on right
          <div style={styles.playerCard(true)}>
            <div style={styles.label('#00f0ff')}>YOU (RIGHT PADDLE)</div>
            <div style={{ 
              width: 'clamp(90px, 16vw, 130px)', 
              height: 'clamp(90px, 16vw, 130px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayerAvatar 
                user={currentPlayer} 
                size="large"
              />
            </div>
            <div style={styles.username('0 0 10px rgba(0, 217, 255, 0.5)')}>
              {currentPlayer.username || 'You'}
            </div>
            <div style={styles.rank('#00d9ff')}>Bronze • Level 1</div>
          </div>
        ) : (
          // Current player is player1, show opponent (player2) on right
          <div style={styles.playerCard(false)}>
            <div style={styles.label(getRankColor(opponent.rankTier))}>OPPONENT (RIGHT PADDLE)</div>
            <div style={{ 
              width: 'clamp(90px, 16vw, 130px)', 
              height: 'clamp(90px, 16vw, 130px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlayerAvatar 
                user={opponent} 
                size="large"
              />
            </div>
            <div style={styles.username(`0 0 10px ${getRankColor(opponent.rankTier)}50`)}>
              {opponent.username || 'Opponent'}
            </div>
            <div style={styles.rank(getRankColor(opponent.rankTier))}>
              {opponent.rankTier || 'Bronze'} • Level {opponent.level || 1}
            </div>
          </div>
        )}
      </div>

      <div style={styles.startingText}>
        Preparing match...
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.9; 
            transform: scale(1.05); 
          }
        }
        
        @keyframes shimmer {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        @keyframes glow {
          0%, 100% { 
            box-shadow: 0 0 20px currentColor, inset 0 0 20px rgba(255, 255, 255, 0.2);
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 0 50px currentColor, 0 0 80px currentColor, inset 0 0 40px rgba(255, 255, 255, 0.4);
            filter: brightness(1.2);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(10px, -20px) scale(1.05); }
          50% { transform: translate(0, -40px) scale(1.1); }
          75% { transform: translate(-10px, -20px) scale(1.05); }
          100% { transform: translate(0, 0) scale(1); }
        }
        
        @keyframes countdownPulse {
          0% { 
            transform: scale(0.5) rotate(-10deg); 
            opacity: 0;
            filter: blur(10px);
          }
          50% { 
            transform: scale(1.3) rotate(5deg); 
            filter: blur(0px);
          }
          100% { 
            transform: scale(1) rotate(0deg); 
            opacity: 1;
            filter: blur(0px);
          }
        }
        
        @keyframes slideInLeft {
          0% {
            transform: translateX(-100px) rotate(-10deg);
            opacity: 0;
          }
          100% {
            transform: translateX(0) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes slideInRight {
          0% {
            transform: translateX(100px) rotate(10deg);
            opacity: 0;
          }
          100% {
            transform: translateX(0) rotate(0deg);
            opacity: 1;
          }
        }
        
        @keyframes floatParticle1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          25% { transform: translate(30px, -40px) scale(1.2); opacity: 1; }
          50% { transform: translate(-20px, -80px) scale(0.8); opacity: 0.5; }
          75% { transform: translate(-40px, -40px) scale(1.1); opacity: 0.8; }
        }
        
        @keyframes floatParticle2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          33% { transform: translate(-50px, 30px) scale(1.3); opacity: 1; }
          66% { transform: translate(40px, -30px) scale(0.9); opacity: 0.7; }
        }
        
        @keyframes floatParticle3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
          20% { transform: translate(20px, 40px) scale(0.7); opacity: 0.5; }
          40% { transform: translate(-30px, 20px) scale(1.4); opacity: 1; }
          60% { transform: translate(50px, -20px) scale(0.9); opacity: 0.6; }
          80% { transform: translate(-10px, -40px) scale(1.2); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
