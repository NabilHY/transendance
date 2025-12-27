// Match History Panel - Displays player's match history

import React, { useEffect, useState } from 'react';
import { Clock, Users, Trophy, Calendar } from 'lucide-react';
import { getGameBackendUrl } from '../utils/api';
import styles from '../styles.module.css';

interface MatchHistoryEntry {
  id: number;
  game_type: 'solo' | 'ai' | 'matchmaking' | 'tournament' | 'quad';
  player1_id: number;
  player2_id: number | null;
  player3_id: number | null;
  player4_id: number | null;
  player1_username: string;
  player2_username: string | null;
  player3_username: string | null;
  player4_username: string | null;
  winner_id: number;
  winner_username: string;
  score_player1: number;
  score_player2: number;
  tournament_stage: 'quarter' | 'semi' | 'final' | null;
  game_duration: number;
  created_at: string;
  player1_rank_before?: number;
  player1_rank_after?: number;
  player1_points_change?: number;
  player2_rank_before?: number;
  player2_rank_after?: number;
  player2_points_change?: number;
  player3_rank_before?: number;
  player3_rank_after?: number;
  player3_points_change?: number;
  player4_rank_before?: number;
  player4_rank_after?: number;
  player4_points_change?: number;
}

interface MatchHistoryPanelProps {
  userId: number;
  isVisible: boolean;
  refreshTrigger?: number; // Add a refresh trigger
  isGamePage?: boolean;
}

export const MatchHistoryPanel: React.FC<MatchHistoryPanelProps> = ({ userId, isVisible, refreshTrigger, isGamePage }) => {
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !userId) return;

    const fetchMatchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const backendUrl = getGameBackendUrl();
        console.log(`[MatchHistory] Fetching from: ${backendUrl}/api/match-history/${userId}`);
        
        const response = await fetch(`${backendUrl}/api/match-history/${userId}?limit=20`);
        
        console.log(`[MatchHistory] Response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[MatchHistory] Error response:`, errorText);
          throw new Error('Failed to fetch match history');
        }

        const data = await response.json();
        console.log(`[MatchHistory] Received ${data.matches?.length || 0} matches`);
        setMatches(data.matches || []);
      } catch (err) {
        console.error('Error fetching match history:', err);
        setError('Failed to load match history');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchHistory();
  }, [userId, isVisible, refreshTrigger]); // Add refreshTrigger to dependencies

  if (!isVisible) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGameTypeDisplay = (type: string, stage: string | null) => {
    if (type === 'tournament' && stage) {
      const stageNames = {
        quarter: 'Quarter-Final',
        semi: 'Semi-Final',
        final: 'Final'
      };
      return `Tournament (${stageNames[stage as keyof typeof stageNames]})`;
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getPlayersDisplay = (match: MatchHistoryEntry) => {
    if (match.game_type === 'quad') {
      // 2v2 format
      return `${match.player1_username} & ${match.player2_username} vs ${match.player3_username} & ${match.player4_username}`;
    } else {
      // 1v1 format
      return `${match.player1_username} vs ${match.player2_username || 'AI'}`;
    }
  };

  const isWinner = (match: MatchHistoryEntry) => {
    return match.winner_id === userId || 
           (match.game_type === 'quad' && 
            (match.winner_id === match.player1_id || match.winner_id === match.player2_id) && 
            (userId === match.player1_id || userId === match.player2_id));
  };

  return (
    <div className={`${styles.matchHistoryPanel} ${isGamePage ? styles.forGamePage : styles.forProfilePage}`}>
      <h2 className={styles.matchHistoryTitle}>📜 Match History</h2>
      
      {loading && <div className={styles.loading}>Loading match history...</div>}
      
      {error && <div className={styles.error}>{error}</div>}
      
      {!loading && !error && matches.length === 0 && (
        <div className={styles.noMatches}>No matches played yet. Start playing to build your history!</div>
      )}
      
      {!loading && !error && matches.length > 0 && (
        <div className={styles.matchHistoryList}>
          {matches.map((match) => {
            const won = isWinner(match);
            return (
              <div 
                key={match.id} 
                className={`${styles.matchHistoryEntry} ${won ? styles.matchWon : styles.matchLost}`}
              >
                <div className={styles.matchHeader}>
                  <span className={styles.matchResult}>
                    {won ? '✅ Victory' : '❌ Defeat'}
                  </span>
                  <span className={styles.matchType}>
                    {getGameTypeDisplay(match.game_type, match.tournament_stage)}
                  </span>
                </div>
                
                <div className={styles.matchPlayers}>
                  {getPlayersDisplay(match)}
                </div>
                
                <div className={styles.matchDetails}>
                  <span className={styles.matchScore}>
                    <Trophy size={14} /> {match.score_player1} - {match.score_player2}
                  </span>
                  <span className={styles.matchDuration}>
                    <Clock size={14} /> {formatDuration(match.game_duration)}
                  </span>
                  <span className={styles.matchDate}>
                    <Calendar size={14} /> {formatDate(match.created_at)}
                  </span>
                  {(() => {
                    // Determine which player the current user is and show their rank change
                    let pointsChange: number | undefined;
                    
                    if (match.player1_id === userId && match.player1_points_change !== undefined) {
                      pointsChange = match.player1_points_change;
                    } else if (match.player2_id === userId && match.player2_points_change !== undefined) {
                      pointsChange = match.player2_points_change;
                    } else if (match.player3_id === userId && match.player3_points_change !== undefined) {
                      pointsChange = match.player3_points_change;
                    } else if (match.player4_id === userId && match.player4_points_change !== undefined) {
                      pointsChange = match.player4_points_change;
                    }
                    
                    if (pointsChange !== undefined) {
                      return (
                        <span 
                          className={styles.matchRankChange}
                          style={{ 
                            color: pointsChange > 0 ? 'var(--neon-green)' : 'var(--neon-pink)',
                            fontWeight: 600
                          }}
                        >
                          {pointsChange > 0 ? '+' : ''}{pointsChange} RP
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
