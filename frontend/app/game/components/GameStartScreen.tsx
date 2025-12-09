// Start screen component - game mode selection and player stats

import React from 'react';
import { getRankInfo } from '../utils/rank';
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
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "20px", textAlign: "center" }}>Pong Game</h1>
      
      {/* Player Statistics Card */}
      {isAuthenticated && playerStats && (
        <div style={{ 
          marginBottom: "25px",
          padding: "20px",
          backgroundColor: "#1a1a1a",
          borderRadius: "12px",
          border: "2px solid #333",
          maxWidth: "600px",
          margin: "0 auto 25px auto"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "15px"
          }}>
            <h3 style={{ margin: 0, color: "#ffc107" }}>Player Statistics</h3>
            {playerInfo?.username && (
              <div style={{ 
                fontSize: "16px", 
                color: "#4CAF50",
                fontWeight: "bold",
                padding: "5px 12px",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
                border: "1px solid #4CAF50"
              }}>
                @{playerInfo.username}
              </div>
            )}
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
            gap: "15px",
            textAlign: "center"
          }}>
            {(() => {
              const rankInfo = getRankInfo(playerStats.rank_points);
              return (
                <div style={{ 
                  padding: "12px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: `2px solid ${rankInfo.color}`,
                }}>
                  <div style={{ fontSize: "12px", color: "#ccc" }}>Rank</div>
                  <div style={{ 
                    fontSize: "16px", 
                    fontWeight: "bold", 
                    color: rankInfo.color 
                  }}>
                    {rankInfo.tier} {rankInfo.level}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {playerStats.rank_points} RP
                  </div>
                </div>
              );
            })()}
            
            <div style={{ 
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              border: "1px solid #444"
            }}>
              <div style={{ fontSize: "12px", color: "#ccc" }}>Level</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00bfff" }}>
                {playerStats.player_level}
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                {playerStats.experience_points} XP
              </div>
            </div>

            <div style={{ 
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              border: "1px solid #444"
            }}>
              <div style={{ fontSize: "12px", color: "#ccc" }}>Record</div>
              <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                <span style={{ color: "#28a745" }}>{playerStats.games_won}W</span>
                <span style={{ color: "#666" }}> - </span>
                <span style={{ color: "#dc3545" }}>{playerStats.games_lost || 0}L</span>
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                {playerStats.win_rate?.toFixed(1) || 0}% WR
              </div>
            </div>

            <div style={{ 
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              border: "1px solid #444"
            }}>
              <div style={{ fontSize: "12px", color: "#ccc" }}>Streak</div>
              <div style={{ 
                fontSize: "16px", 
                fontWeight: "bold",
                color: playerStats.current_streak > 0 ? "#ffc107" : "#666"
              }}>
                {playerStats.current_streak || 0}
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                {playerStats.current_streak > 0 ? 'Win' : playerStats.current_streak < 0 ? 'Loss' : 'None'}
              </div>
            </div>

            <div style={{ 
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              border: "1px solid #444"
            }}>
              <div style={{ fontSize: "12px", color: "#ccc" }}>Played</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>
                {playerStats.games_played || 0}
              </div>
              <div style={{ fontSize: "11px", color: "#999" }}>
                Total Games
              </div>
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <button
              onClick={onRefreshStats}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Refresh Stats
            </button>
          </div>
        </div>
      )}
      
      {/* Authentication Error */}
      {authError && !isAuthenticated && (
        <div style={{ 
          backgroundColor: "#dc3545", 
          color: "white", 
          padding: "15px", 
          margin: "20px 0", 
          borderRadius: "5px",
          maxWidth: "500px",
          marginLeft: "auto",
          marginRight: "auto"
        }}>
          <h3>Authentication Required</h3>
          <p>{authError}</p>
        </div>
      )}
      
      {/* Game Mode Selection */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h3>Select Game Mode:</h3>
        <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("matchmaking")}
              style={{
                padding: "10px 15px",
                fontSize: "14px",
                backgroundColor: gameMode === "matchmaking" ? "#28a745" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                display: "block",
                marginBottom: "5px"
              }}
            >
              🎮 Find Opponent
            </button>
            <small style={{ color: "#ccc", fontSize: "12px" }}>
              Play online vs another player
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("ai")}
              style={{
                padding: "10px 15px",
                fontSize: "14px",
                backgroundColor: gameMode === "ai" ? "#28a745" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                display: "block",
                marginBottom: "5px"
              }}
            >
              🤖 vs AI
            </button>
            <small style={{ color: "#ccc", fontSize: "12px" }}>
              Play against computer
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("solo")}
              style={{
                padding: "10px 15px",
                fontSize: "14px",
                backgroundColor: gameMode === "solo" ? "#28a745" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                display: "block",
                marginBottom: "5px"
              }}
            >
              👥 Coop Mode
            </button>
            <small style={{ color: "#ccc", fontSize: "12px" }}>
              Local 2-player game
            </small>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => onGameModeChange("tournament")}
              style={{
                padding: "10px 15px",
                fontSize: "14px",
                backgroundColor: gameMode === "tournament" ? "#28a745" : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                display: "block",
                marginBottom: "5px"
              }}
            >
              🏆 Tournament
            </button>
            <small style={{ color: "#ccc", fontSize: "12px" }}>
              8-player bracket
            </small>
          </div>
        </div>
      </div>

      {/* AI Difficulty Selection */}
      {gameMode === "ai" && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h4>AI Difficulty:</h4>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {(["easy", "medium", "hard", "impossible"] as AIDifficulty[]).map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => onAiDifficultyChange(difficulty)}
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  backgroundColor: aiDifficulty === difficulty ? "#007bff" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {difficulty === "impossible" ? "🔥 Impossible" : 
                 difficulty === "hard" ? "💪 Hard" :
                 difficulty === "medium" ? "⚖️ Medium" : "😊 Easy"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <button 
          onClick={onStartGame}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {gameMode === "matchmaking" ? "🎮 Find Opponent" : 
           gameMode === "ai" ? `🤖 Fight ${aiDifficulty.toUpperCase()} AI` : 
           gameMode === "tournament" ? "🏆 Join Tournament" :
           "👥 Start Coop"}
        </button>
      </div>
    </div>
  );
};

