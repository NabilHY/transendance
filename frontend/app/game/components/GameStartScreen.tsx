import React, { useEffect, useState } from 'react';
import { Gamepad2, Bot, Users, Trophy, Grid3x3, Zap, Scale } from 'lucide-react';
import { getRankInfo } from '../utils/rank';
import { getGameBackendUrl, getAuthToken } from '../utils/api';
import styles from '../styles.module.css';
import type { GameMode, AIDifficulty, PlayerStats, PlayerInfo } from '../types';

interface GameStartScreenProps {
  isAuthenticated: boolean;
  playerStats: PlayerStats | null;
  playerInfo: PlayerInfo | null;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  authError: string | null;
  onGameModeChange: (mode: GameMode) => void;
  onAiDifficultyChange: (difficulty: AIDifficulty) => void;
  onStartGame: () => void;
  onRefreshStats: () => void;
}

export const GameStartScreen: React.FC<GameStartScreenProps> = ({
  isAuthenticated,
  playerStats: propsPlayerStats,
  playerInfo,
  gameMode,
  aiDifficulty,
  authError,
  onGameModeChange,
  onAiDifficultyChange,
  onStartGame,
  onRefreshStats
}) => {
  // Internal state for stats if not provided via props
  const [localPlayerStats, setLocalPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Use props stats if available, otherwise use local state
  const playerStats = propsPlayerStats || localPlayerStats;

  // Fetch player stats directly from API
  const fetchPlayerStats = async () => {
    if (!isAuthenticated) return;
    
    setStatsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No token available for stats fetch');
        setStatsLoading(false);
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

      const response = await makeRequest(token);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got player stats:', data);
        if (data.stats) {
          setLocalPlayerStats(data.stats);
        }
      } else {
        console.log('❌ Failed to fetch player stats:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching player stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch stats on mount if authenticated and no stats provided
  useEffect(() => {
    console.log('[GameStartScreen] useEffect - isAuthenticated:', isAuthenticated, 'propsPlayerStats:', propsPlayerStats, 'localPlayerStats:', localPlayerStats);
    if (isAuthenticated && !propsPlayerStats) {
      console.log('[GameStartScreen] Fetching player stats...');
      fetchPlayerStats();
    }
  }, [isAuthenticated, propsPlayerStats]);

  console.log('[GameStartScreen] Render - isAuthenticated:', isAuthenticated, 'playerStats:', playerStats);

  return (
    <div className={styles.container}>
      <div className={styles.cardHeader} style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 className={styles.title}>Pong Game</h1>
        <p className={styles.subtitle}>Choose your game mode and start playing</p>
      </div>
      
      {/* Player Statistics Card */}
      {isAuthenticated && !playerStats && statsLoading && (
        <div className={styles.card} style={{ marginBottom: '24px', textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#7ab8ff', margin: 0 }}>Loading stats...</p>
        </div>
      )}
      
      {isAuthenticated && playerStats && (
        <div className={styles.card} style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#e4ecff" }}>Player Statistics</h2>
            {playerInfo?.username && (
              <div style={{
                fontSize: "14px", 
                color: "#7ab8ff",
                fontWeight: 600,
                padding: "6px 12px",
                background: "rgba(47, 140, 255, 0.15)",
                borderRadius: "8px",
                border: "1px solid rgba(47, 140, 255, 0.3)"
              }}>
                @{playerInfo.username}
              </div>
            )}
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
            gap: "16px"
          }}>
            {(() => {
              const rankInfo = getRankInfo(playerStats.rank_points);
              return (
                <div className={styles.statCard} style={{ borderColor: rankInfo.color }}>
                  <div className={styles.statLabel}>Rank</div>
                  <div className={styles.statValue} style={{ color: rankInfo.color }}>
                    {rankInfo.tier} {rankInfo.level}
                  </div>
                  <div className={styles.statSubtext}>
                    {playerStats.rank_points} RP
                  </div>
                </div>
              );
            })()}
            
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Level</div>
              <div className={styles.statValue} style={{ color: "#7ab8ff" }}>
                {playerStats.player_level}
              </div>
              <div className={styles.statSubtext}>
                {playerStats.experience_points} XP
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Record</div>
              <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
                <span style={{ color: "var(--neon-green)" }}>{playerStats.games_won}W</span>
                <span style={{ color: "#6b7593" }}> - </span>
                <span style={{ color: "var(--neon-pink)" }}>{playerStats.games_lost || 0}L</span>
              </div>
              <div style={{ 
                fontSize: "24px", 
                fontWeight: 700, 
                fontFamily: "'Orbitron', sans-serif",
                background: "linear-gradient(135deg, var(--neon-blue), var(--neon-purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                {playerStats.win_rate?.toFixed(1) || 0}% WR
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Streak</div>
              <div className={styles.statValue} style={{ 
                color: playerStats.current_streak > 0 ? "#ffc107" : playerStats.current_streak < 0 ? "#ff9595" : "#8c96b6"
              }}>
                {playerStats.current_streak || 0}
              </div>
              <div className={styles.statSubtext}>
                {playerStats.current_streak > 0 ? 'Win' : playerStats.current_streak < 0 ? 'Loss' : 'None'}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Played</div>
              <div className={styles.statValue}>
                {playerStats.games_played || 0}
              </div>
              <div className={styles.statSubtext}>
                Total Games
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={() => {
                if (onRefreshStats) {
                  onRefreshStats();
                } else {
                  fetchPlayerStats();
                }
              }}
              className={styles.buttonSecondary}
              style={{ padding: "8px 16px", fontSize: "13px" }}
              disabled={statsLoading}
            >
              {statsLoading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>
        </div>
      )}
      
      {/* Authentication Error */}
      {authError && !isAuthenticated && (
        <div className={styles.errorMessage}>
          <strong>Authentication Required</strong>
          <p style={{ margin: "8px 0 0 0" }}>{authError}</p>
        </div>
      )}
      
      {/* Game Mode Selection */}
      <div className={styles.card}>
        <h3 style={{ 
          margin: "0 0 20px 0", 
          fontSize: "18px", 
          fontWeight: 600, 
          color: "#e4ecff",
          textAlign: "center"
        }}>
          Select Game Mode
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("matchmaking")}
              className={`${styles.modeButton} ${gameMode === "matchmaking" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Gamepad2 size={18} /> Find Opponent
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Play online vs another player
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("ai")}
              className={`${styles.modeButton} ${gameMode === "ai" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Bot size={18} /> vs AI
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Play against computer
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("solo")}
              className={`${styles.modeButton} ${gameMode === "solo" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Users size={18} /> Coop Mode
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Local 2-player game
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("tournament")}
              className={`${styles.modeButton} ${gameMode === "tournament" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Trophy size={18} /> Tournament
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              8-player bracket
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("quad")}
              className={`${styles.modeButton} ${gameMode === "quad" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Grid3x3 size={18} /> Quadra Pong
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              4-player team battle (2v2)
            </small>
          </div>
        </div>

        {/* AI Difficulty Selection */}
        {gameMode === "ai" && (
          <>
            <div className={styles.divider}></div>
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ 
                margin: "0 0 12px 0", 
                fontSize: "15px", 
                fontWeight: 600, 
                color: "#e4ecff",
                textAlign: "center"
              }}>
                AI Difficulty
              </h4>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                {(["easy", "medium", "hard", "impossible"] as AIDifficulty[]).map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => onAiDifficultyChange(difficulty)}
                    className={`${styles.difficultyButton} ${aiDifficulty === difficulty ? styles.difficultyButtonActive : ''}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    {difficulty === "impossible" ? <><Zap size={14} /> Impossible</> : 
                     difficulty === "hard" ? <><Zap size={14} /> Hard</> :
                     difficulty === "medium" ? <><Scale size={14} /> Medium</> : <><Zap size={14} /> Easy</>}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button 
            onClick={onStartGame}
            className={styles.button}
            style={{ minWidth: "200px" }}
          >
            {gameMode === "matchmaking" ? <><Gamepad2 size={20} /> Find Opponent</> : 
             gameMode === "ai" ? <><Bot size={20} /> Fight {aiDifficulty.toUpperCase()} AI</> : 
             gameMode === "tournament" ? <><Trophy size={20} /> Join Tournament</> :
             gameMode === "quad" ? <><Grid3x3 size={20} /> Find Team Match</> :
             <><Users size={20} /> Start Coop</>}
          </button>
        </div>
      </div>
    </div>
  );
};
