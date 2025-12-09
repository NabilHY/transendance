import React from 'react';
import { getRankInfo } from '../utils/rank';
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
  playerStats,
  playerInfo,
  gameMode,
  aiDifficulty,
  authError,
  onGameModeChange,
  onAiDifficultyChange,
  onStartGame,
  onRefreshStats
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.cardHeader} style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 className={styles.title}>Pong Game</h1>
        <p className={styles.subtitle}>Choose your game mode and start playing</p>
      </div>
      
      {/* Player Statistics Card */}
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
              <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                <span style={{ color: "#34ce57" }}>{playerStats.games_won}W</span>
                <span style={{ color: "#6b7593" }}> - </span>
                <span style={{ color: "#ff9595" }}>{playerStats.games_lost || 0}L</span>
              </div>
              <div className={styles.statSubtext}>
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
              onClick={onRefreshStats}
              className={styles.buttonSecondary}
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              Refresh Stats
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
              style={{ width: "100%", marginBottom: "8px" }}
            >
              🎮 Find Opponent
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Play online vs another player
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("ai")}
              className={`${styles.modeButton} ${gameMode === "ai" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px" }}
            >
              🤖 vs AI
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Play against computer
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("solo")}
              className={`${styles.modeButton} ${gameMode === "solo" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px" }}
            >
              👥 Coop Mode
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              Local 2-player game
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("tournament")}
              className={`${styles.modeButton} ${gameMode === "tournament" ? styles.modeButtonActive : ''}`}
              style={{ width: "100%", marginBottom: "8px" }}
            >
              🏆 Tournament
            </button>
            <small style={{ color: "#8c96b6", fontSize: "12px" }}>
              8-player bracket
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
                  >
                    {difficulty === "impossible" ? "🔥 Impossible" : 
                     difficulty === "hard" ? "💪 Hard" :
                     difficulty === "medium" ? "⚖️ Medium" : "😊 Easy"}
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
            {gameMode === "matchmaking" ? "🎮 Find Opponent" : 
             gameMode === "ai" ? `🤖 Fight ${aiDifficulty.toUpperCase()} AI` : 
             gameMode === "tournament" ? "🏆 Join Tournament" :
             "👥 Start Coop"}
          </button>
        </div>
      </div>
    </div>
  );
};
