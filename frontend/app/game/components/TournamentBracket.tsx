// Tournament Bracket Display - Shows 8-player tournament progression

import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Zap } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import { umGetUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface BracketPlayer {
  userId: number;
  username: string;
  avatar?: string;
  isWinner?: boolean;
}

interface BracketMatch {
  matchId: string;
  player1: BracketPlayer | null;
  player2: BracketPlayer | null;
  winner: BracketPlayer | null;
  stage: 'quarter' | 'semi' | 'final';
  isComplete: boolean;
}

interface TournamentBracketProps {
  bracket: BracketMatch[];
  currentUserId: number;
  onReady?: () => void;
  showReadyButton?: boolean;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ 
  bracket, 
  currentUserId,
  onReady,
  showReadyButton = false
}) => {
  const { ensureCsrf } = useAuth();
  const [playerAvatars, setPlayerAvatars] = useState<Map<number, string>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch avatars for all players
  useEffect(() => {
    const fetchAvatars = async () => {
      const avatarMap = new Map<number, string>();
      const uniqueUserIds = new Set<number>();

      // Collect all unique user IDs from bracket
      bracket.forEach(match => {
        if (match.player1) uniqueUserIds.add(match.player1.userId);
        if (match.player2) uniqueUserIds.add(match.player2.userId);
      });

      // Fetch avatars
      for (const userId of uniqueUserIds) {
        try {
          await ensureCsrf();
          const result = await umGetUser(userId);
          if (result.ok && result.data && typeof result.data === 'object' && 'id' in result.data) {
            const user = result.data;
            const avatarUrl = await getAvatarUrl(user);
            if (avatarUrl) {
              avatarMap.set(userId, avatarUrl);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch avatar for user ${userId}:`, err);
        }
      }

      setPlayerAvatars(avatarMap);
    };

    if (mounted && bracket.length > 0) {
      fetchAvatars();
    }
  }, [mounted, bracket, ensureCsrf]);

  // Organize matches by stage
  const quarterFinals = bracket.filter((m: BracketMatch) => m.stage === 'quarter');
  const semiFinals = bracket.filter((m: BracketMatch) => m.stage === 'semi');
  const final = bracket.find((m: BracketMatch) => m.stage === 'final');

  const renderPlayer = (player: BracketPlayer | null, isWinner: boolean, isCurrentUser: boolean) => {
    if (!player) {
      return (
        <div style={styles.emptyPlayer}>
          <div style={styles.emptyPlayerText}>Waiting...</div>
        </div>
      );
    }

    const avatar = playerAvatars.get(player.userId);

    return (
      <div style={{
        ...styles.player,
        ...(isWinner && styles.playerWinner),
        ...(isCurrentUser && styles.playerCurrent),
      }}>
        {isCurrentUser && (
          <div style={styles.currentPlayerBadge}>
            <Zap style={{ width: '12px', height: '12px' }} />
          </div>
        )}
        <img
          src={avatar || '/default-avatar.png'}
          alt={player.username}
          style={styles.playerAvatar}
        />
        <div style={styles.playerName}>{player.username}</div>
        {isWinner && (
          <Crown style={{
            width: '16px',
            height: '16px',
            color: '#ffd700',
            marginLeft: '6px',
            filter: 'drop-shadow(0 0 8px #ffd70080)'
          }} />
        )}
      </div>
    );
  };

  const renderMatch = (match: BracketMatch, index: number) => {
    const isCurrentUserMatch = 
      match.player1?.userId === currentUserId || 
      match.player2?.userId === currentUserId;

    return (
      <div 
        key={match.matchId} 
        style={{
          ...styles.match,
          ...(isCurrentUserMatch && styles.matchHighlight)
        }}
      >
        {renderPlayer(
          match.player1, 
          match.winner?.userId === match.player1?.userId,
          match.player1?.userId === currentUserId
        )}
        
        <div style={styles.matchVs}>VS</div>
        
        {renderPlayer(
          match.player2,
          match.winner?.userId === match.player2?.userId,
          match.player2?.userId === currentUserId
        )}

        {match.isComplete && (
          <div style={styles.matchCompleteLabel}>Complete</div>
        )}
      </div>
    );
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #050811 0%, #0a0e1a 100%)',
      padding: '32px 16px',
      position: 'relative' as const,
      overflow: 'auto'
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
        repeating-linear-gradient(0deg, rgba(0, 240, 255, 0.03) 0px, transparent 2px, transparent 4px)
      `,
      pointerEvents: 'none' as const,
      zIndex: 0
    },
    title: {
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 'clamp(28px, 5vw, 48px)',
      fontWeight: 800,
      color: '#e8f0ff',
      marginBottom: '16px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.15em',
      textShadow: '0 0 20px rgba(0, 240, 255, 0.6), 0 0 40px rgba(183, 68, 255, 0.4)',
      background: 'linear-gradient(135deg, #00f0ff 0%, #b744ff 50%, #ff006e 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textAlign: 'center' as const,
      zIndex: 1
    },
    subtitle: {
      fontSize: 'clamp(14px, 2vw, 18px)',
      color: '#8c96b6',
      marginBottom: '32px',
      textAlign: 'center' as const,
      zIndex: 1
    },
    bracketContainer: {
      display: 'flex',
      gap: '48px',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      maxWidth: '1400px',
      zIndex: 1,
      marginBottom: '24px'
    },
    stage: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px',
      alignItems: 'center'
    },
    stageTitle: {
      fontSize: 'clamp(16px, 2.5vw, 22px)',
      fontWeight: 700,
      color: '#00f0ff',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      marginBottom: '16px',
      textShadow: '0 0 12px rgba(0, 240, 255, 0.6)',
      textAlign: 'center' as const
    },
    match: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      padding: '16px',
      background: 'rgba(15, 20, 35, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      minWidth: '220px',
      position: 'relative' as const,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease'
    },
    matchHighlight: {
      border: '2px solid rgba(0, 240, 255, 0.6)',
      boxShadow: '0 0 24px rgba(0, 240, 255, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)',
      background: 'rgba(0, 240, 255, 0.05)'
    },
    matchVs: {
      textAlign: 'center' as const,
      fontSize: '14px',
      fontWeight: 700,
      color: '#b744ff',
      letterSpacing: '0.1em',
      padding: '4px 0'
    },
    player: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      background: 'rgba(20, 25, 40, 0.6)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'relative' as const,
      transition: 'all 0.3s ease'
    },
    playerWinner: {
      background: 'rgba(0, 240, 255, 0.15)',
      border: '1px solid rgba(0, 240, 255, 0.5)',
      boxShadow: '0 0 16px rgba(0, 240, 255, 0.3)'
    },
    playerCurrent: {
      border: '2px solid rgba(255, 215, 0, 0.6)',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
    },
    currentPlayerBadge: {
      position: 'absolute' as const,
      top: '-8px',
      right: '-8px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
      zIndex: 1
    },
    playerAvatar: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      objectFit: 'cover' as const,
      border: '2px solid rgba(0, 240, 255, 0.3)',
      flexShrink: 0
    },
    playerName: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#e8f0ff',
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const
    },
    emptyPlayer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 12px',
      background: 'rgba(20, 25, 40, 0.3)',
      borderRadius: '8px',
      border: '1px dashed rgba(255, 255, 255, 0.2)',
      minHeight: '58px'
    },
    emptyPlayerText: {
      fontSize: '14px',
      color: '#5a6378',
      fontStyle: 'italic' as const
    },
    matchCompleteLabel: {
      position: 'absolute' as const,
      top: '-10px',
      right: '12px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      padding: '4px 10px',
      background: 'rgba(0, 255, 136, 0.15)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 255, 136, 0.4)',
      boxShadow: '0 0 12px rgba(0, 255, 136, 0.3)'
    },
    connector: {
      width: '40px',
      height: '2px',
      background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.3), rgba(183, 68, 255, 0.3))',
      alignSelf: 'center' as const
    },
    readyButton: {
      padding: '14px 32px',
      fontSize: '16px',
      fontWeight: 700,
      color: '#0a0e1a',
      background: 'linear-gradient(135deg, #00f0ff, #00a8ff)',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      boxShadow: '0 0 24px rgba(0, 240, 255, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
      zIndex: 1,
      marginTop: '16px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern} />
      
      <h1 style={styles.title}>
        <Trophy style={{ width: '32px', height: '32px', display: 'inline', marginRight: '12px' }} />
        Tournament Bracket
      </h1>
      
      <p style={styles.subtitle}>8-Player Single Elimination</p>
      
      <div style={styles.bracketContainer}>
        {/* Quarter Finals */}
        <div style={styles.stage}>
          <div style={styles.stageTitle}>Quarter Finals</div>
          {quarterFinals.map((match: BracketMatch, idx: number) => renderMatch(match, idx))}
        </div>
        
        {quarterFinals.length > 0 && <div style={styles.connector} />}
        
        {/* Semi Finals */}
        <div style={styles.stage}>
          <div style={styles.stageTitle}>Semi Finals</div>
          {semiFinals.map((match: BracketMatch, idx: number) => renderMatch(match, idx))}
        </div>
        
        {semiFinals.length > 0 && <div style={styles.connector} />}
        
        {/* Final */}
        {final && (
          <div style={styles.stage}>
            <div style={styles.stageTitle}>
              <Crown style={{ width: '20px', height: '20px', display: 'inline', marginRight: '8px' }} />
              Grand Final
            </div>
            {renderMatch(final, 0)}
          </div>
        )}
      </div>

      {showReadyButton && onReady && (
        <button 
          style={styles.readyButton}
          onClick={onReady}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 32px rgba(0, 240, 255, 0.7), 0 4px 20px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 240, 255, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)';
          }}
        >
          I'm Ready!
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
