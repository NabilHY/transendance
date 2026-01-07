// Match History Panel - Displays player's match history

import React, { useEffect, useState } from 'react';
import { Clock, Users, Trophy, Calendar } from 'lucide-react';
import Link from 'next/link';
import { getGameBackendUrl } from '../utils/api';
import styles from '../styles.module.css';
import userProfileStyles from '@/app/users/[id]/UserProfile.module.css';

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
  isGamePage?: boolean; // Whether this is on the game page or user profile page
}

export const MatchHistoryPanel: React.FC<MatchHistoryPanelProps> = ({ userId, isVisible, refreshTrigger, isGamePage = true }) => {
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

  const containerStyles = isGamePage ? styles : userProfileStyles;
      
  return (
    <>
      {loading && <div className={containerStyles.loading}>Loading match history...</div>}
      
      {error && <div className={containerStyles.error}>{error}</div>}
      
      {!loading && !error && matches.length === 0 && (
        <div className={isGamePage ? styles.noMatches : userProfileStyles.emptyState}>
          {!isGamePage && (
            <>
              <div className={userProfileStyles.emptyStateIcon}>🎮</div>
              <h3 className={userProfileStyles.emptyStateTitle}>No Matches Yet</h3>
              <p className={userProfileStyles.emptyStateText}>
                Start playing matches to build your competitive history and track your progress!
              </p>
              <Link href="/game" className={userProfileStyles.emptyStateCta}>
                Start Playing
              </Link>
            </>
          )}
          {isGamePage && 'No matches played yet. Start playing to build your history!'}
        </div>
      )}
      
      {!loading && !error && matches.length > 0 && (
        <div className={containerStyles.matchHistoryList}>
          {matches.map((match) => {
            const won = isWinner(match);
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
            
            return (
              <div 
                key={match.id} 
                className={`${containerStyles.matchHistoryEntry} ${won ? containerStyles.matchWon : containerStyles.matchLost}`}
              >
                <div className={containerStyles.matchHeader}>
                  <span className={containerStyles.matchResult}>
                    {won ? '✅ Victory' : '❌ Defeat'}
                  </span>
                  <span className={containerStyles.matchType}>
                    {getGameTypeDisplay(match.game_type, match.tournament_stage)}
                  </span>
                </div>
                
                <div className={containerStyles.matchPlayers}>
                  {getPlayersDisplay(match)}
                </div>
                
                <div className={containerStyles.matchDetails}>
                  <span className={containerStyles.matchScore}>
                    <Trophy size={14} /> {match.score_player1} - {match.score_player2}
                  </span>
                  <span className={containerStyles.matchDuration}>
                    <Clock size={14} /> {formatDuration(match.game_duration)}
                  </span>
                  <span className={containerStyles.matchDate}>
                    <Calendar size={14} /> {formatDate(match.created_at)}
                  </span>
                  {pointsChange !== undefined && (
                    <span 
                      className={`${containerStyles.matchRankChange} ${pointsChange > 0 ? containerStyles.matchRankChangePositive : containerStyles.matchRankChangeNegative}`}
                    >
                      {pointsChange > 0 ? '+' : ''}{pointsChange} RP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
