// Win screen component - shows game results and stats

import React from 'react';
import type { WinScreenData, GameState } from '../types';

interface GameWinScreenProps {
  winScreenData: WinScreenData | null;
  gameState: GameState | null;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameWinScreen: React.FC<GameWinScreenProps> = ({
  winScreenData,
  gameState,
  onRestart,
  onMainMenu
}) => {
  if (winScreenData?.isTournament) {
    const { playerData, matchData } = winScreenData;
    const isWinner = playerData.won;
    const isChampion = matchData.isTournamentWinner;
    const waitingForNext = matchData.waitingForNextRound;
    const stats = playerData.stats;
    
    const winRate = stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : '0.0';
    
    return (
      <div style={{
        padding: "30px",
        backgroundColor: "#1a1a1a",
        borderRadius: "15px",
        border: `3px solid ${isWinner ? "#28a745" : "#dc3545"}`,
        maxWidth: "700px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "48px",
          color: isWinner ? "#ffd700" : "#dc3545",
          textShadow: isWinner ? "0 0 20px #ffd700" : "0 0 20px #dc3545",
          marginBottom: "10px",
          fontWeight: "bold"
        }}>
          {isChampion ? "👑 TOURNAMENT CHAMPION! 👑" : 
           isWinner ? "🎉 VICTORY! 🎉" : 
           "💔 ELIMINATED 💔"}
        </h1>
        
        <p style={{ fontSize: "18px", color: "#ccc", marginBottom: "20px" }}>
          <strong>vs</strong> {playerData.opponent}
        </p>
        
        <div style={{
          backgroundColor: "#2a2a2a",
          padding: "25px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <h3 style={{ color: "#ffc107", marginTop: 0, marginBottom: "20px" }}>
            📊 Stats Update
          </h3>
          
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            marginBottom: "15px"
          }}>
            <span style={{ fontSize: "16px", color: "#aaa" }}>Ranked Rating</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px", color: "#fff" }}>{stats.oldRating}</span>
              <span style={{ 
                fontSize: "20px", 
                color: playerData.ratingChange >= 0 ? "#28a745" : "#dc3545",
                fontWeight: "bold"
              }}>
                →
              </span>
              <span style={{ 
                fontSize: "20px", 
                color: playerData.ratingChange >= 0 ? "#28a745" : "#dc3545",
                fontWeight: "bold"
              }}>
                {stats.newRating} ({playerData.ratingChange >= 0 ? '+' : ''}{playerData.ratingChange})
              </span>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            marginBottom: "15px"
          }}>
            <span style={{ fontSize: "16px", color: "#aaa" }}>Experience</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px", color: "#fff" }}>{stats.oldXp}</span>
              <span style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>→</span>
              <span style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>
                {stats.newXp} (+{playerData.xpGain})
              </span>
            </div>
          </div>
          
          {stats.newLevel > stats.oldLevel && (
            <div style={{
              padding: "12px",
              backgroundColor: "#ffc107",
              borderRadius: "8px",
              marginBottom: "15px",
              border: "2px solid #ff9800"
            }}>
              <span style={{ fontSize: "18px", color: "#000", fontWeight: "bold" }}>
                🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
              </span>
            </div>
          )}
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            marginTop: "15px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#aaa" }}>Matches</div>
              <div style={{ fontSize: "20px", color: "#fff", fontWeight: "bold" }}>{stats.totalMatches}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#aaa" }}>Wins</div>
              <div style={{ fontSize: "20px", color: "#28a745", fontWeight: "bold" }}>{stats.wins}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#aaa" }}>Win Rate</div>
              <div style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>{winRate}%</div>
            </div>
          </div>
        </div>
        
        {isChampion && (
          <div style={{
            backgroundColor: "#2a2a2a",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "3px solid #ffd700",
            boxShadow: "0 0 20px #ffd700"
          }}>
            <p style={{ fontSize: "24px", color: "#ffd700", fontWeight: "bold", margin: 0 }}>
              🏆 You are the Tournament Champion! 🏆
            </p>
          </div>
        )}
        
        {isWinner && waitingForNext && !isChampion && (
          <div style={{
            backgroundColor: "#2a2a2a",
            padding: "18px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "2px solid #28a745"
          }}>
            <p style={{ fontSize: "18px", color: "#28a745", fontWeight: "bold", margin: 0 }}>
              ✅ You've Advanced to the Next Round!
            </p>
          </div>
        )}
        
        <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "20px" }}>
          {isWinner && waitingForNext ? (
            <button
              onClick={onMainMenu}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              ➡️ Continue
            </button>
          ) : (
            <button
              onClick={onMainMenu}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🏠 Return to Main Menu
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (!winScreenData) {
    return (
      <div style={{
        padding: "30px",
        backgroundColor: "#1a1a1a",
        borderRadius: "15px",
        border: "2px solid #333",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "48px",
          color: gameState?.winner === 'Player 1' ? "#28a745" : "#dc3545",
          marginBottom: "20px",
          fontWeight: "bold"
        }}>
          🎉 {gameState?.winner} Wins! 🎉
        </h1>
        
        <p style={{ fontSize: "24px", marginBottom: "30px" }}>
          Final Score: {gameState?.player1?.score || 0} - {gameState?.player2?.score || 0}
        </p>
        
        <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
          <button
            onClick={onRestart}
            style={{
              padding: "12px 25px",
              fontSize: "16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            🎮 Play Again
          </button>
          <button
            onClick={onMainMenu}
            style={{
              padding: "12px 25px",
              fontSize: "16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    );
  }

  const { playerData, matchData } = winScreenData;
  
  return (
    <div style={{
      padding: "30px",
      backgroundColor: "#1a1a1a",
      borderRadius: "15px",
      border: "2px solid #333",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h1 style={{
        fontSize: "48px",
        color: playerData.result === 'victory' ? "#28a745" : "#dc3545",
        marginBottom: "20px",
        fontWeight: "bold"
      }}>
        🎉 {playerData.result?.toUpperCase() || 'GAME OVER'} 🎉
      </h1>

      <div style={{ 
        backgroundColor: "#2a2a2a", 
        padding: "20px", 
        borderRadius: "10px", 
        marginBottom: "25px" 
      }}>
        <h3 style={{ color: "#ffd700", marginBottom: "15px" }}>Match Summary</h3>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span><strong>Duration:</strong> {matchData.duration}</span>
          <span><strong>Winner:</strong> {matchData.winnerName}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span><strong>Final Score:</strong> {matchData.player1Score} - {matchData.player2Score}</span>
          <span><strong>Total Volleys:</strong> {matchData.totalVolleys}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
        <button
          onClick={onRestart}
          style={{
            padding: "12px 25px",
            fontSize: "16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🎮 Play Again
        </button>
        <button
          onClick={onMainMenu}
          style={{
            padding: "12px 25px",
            fontSize: "16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🏠 Main Menu
        </button>
      </div>
    </div>
  );
};

