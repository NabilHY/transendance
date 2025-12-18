// Win screen component - shows game results and stats

import React from 'react';
import styles from '../styles.module.css';
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
      <div className={styles.container}>
        <div className={styles.card} style={{ 
          maxWidth: "700px", 
          margin: "0 auto",
          borderColor: isWinner ? "#34ce57" : "#ff9595"
        }}>
          <div className={styles.cardHeader} style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "36px",
              color: isChampion ? "#ffc107" : isWinner ? "#34ce57" : "#ff9595",
              margin: 0,
              fontWeight: 700
            }}>
              {isChampion ? "👑 TOURNAMENT CHAMPION! 👑" : 
               isWinner ? "🎉 VICTORY! 🎉" : 
               "💔 ELIMINATED 💔"}
            </h1>
            <p style={{ fontSize: "16px", color: "#8c96b6", margin: "12px 0 0 0" }}>
              <strong>vs</strong> {playerData.opponent}
            </p>
          </div>
          
          <div className={styles.card} style={{ 
            marginTop: "24px",
            background: "rgba(12, 20, 35, 0.85)",
            padding: "24px"
          }}>
            <h3 style={{ 
              color: "#7ab8ff", 
              marginTop: 0, 
              marginBottom: "20px",
              fontSize: "18px",
              fontWeight: 600
            }}>
              📊 Stats Update
            </h3>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "#050b16",
              borderRadius: "12px",
              marginBottom: "12px",
              border: "1px solid #1b253f"
            }}>
              <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Ranked Rating</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldRating}</span>
                <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                <span style={{ 
                  fontSize: "18px", 
                  color: playerData.ratingChange >= 0 ? "#34ce57" : "#ff9595",
                  fontWeight: 700
                }}>
                  {stats.newRating} ({playerData.ratingChange >= 0 ? '+' : ''}{playerData.ratingChange})
                </span>
              </div>
            </div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "#050b16",
              borderRadius: "12px",
              marginBottom: "12px",
              border: "1px solid #1b253f"
            }}>
              <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Experience</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldXp}</span>
                <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                <span style={{ fontSize: "18px", color: "#7ab8ff", fontWeight: 700 }}>
                  {stats.newXp} (+{playerData.xpGain})
                </span>
              </div>
            </div>
            
            {stats.newLevel > stats.oldLevel && (
              <div style={{
                padding: "16px",
                background: "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2))",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "2px solid rgba(255, 193, 7, 0.4)"
              }}>
                <span style={{ fontSize: "16px", color: "#ffc107", fontWeight: 700 }}>
                  🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
                </span>
              </div>
            )}
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginTop: "16px"
            }}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Matches</div>
                <div className={styles.statValue}>{stats.totalMatches}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Wins</div>
                <div className={styles.statValue} style={{ color: "#34ce57" }}>{stats.wins}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Win Rate</div>
                <div className={styles.statValue} style={{ color: "#7ab8ff" }}>{winRate}%</div>
              </div>
            </div>
          </div>
          
          {isChampion && (
            <div style={{
              background: "rgba(255, 193, 7, 0.1)",
              padding: "20px",
              borderRadius: "16px",
              marginTop: "24px",
              border: "2px solid rgba(255, 193, 7, 0.3)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "20px", color: "#ffc107", fontWeight: 700, margin: 0 }}>
                🏆 You are the Tournament Champion! 🏆
              </p>
            </div>
          )}
          
          {isWinner && waitingForNext && !isChampion && (
            <div style={{
              background: "rgba(52, 206, 87, 0.1)",
              padding: "16px",
              borderRadius: "12px",
              marginTop: "24px",
              border: "1px solid rgba(52, 206, 87, 0.3)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "16px", color: "#34ce57", fontWeight: 600, margin: 0 }}>
                ✅ You've Advanced to the Next Round!
              </p>
            </div>
          )}
          
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
            {isWinner && waitingForNext ? (
              <button
                onClick={onMainMenu}
                className={styles.buttonSuccess}
              >
                ➡️ Continue
              </button>
            ) : (
              <button
                onClick={onMainMenu}
                className={styles.button}
              >
                🏠 Return to Main Menu
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!winScreenData) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ 
          maxWidth: "600px", 
          margin: "0 auto",
          textAlign: "center"
        }}>
          <div className={styles.cardHeader}>
            <h1 style={{
              fontSize: "36px",
              color: gameState?.winner === 'Player 1' ? "#34ce57" : "#ff9595",
              margin: 0,
              fontWeight: 700
            }}>
              🎉 {gameState?.winner} Wins! 🎉
            </h1>
            <p style={{ fontSize: "18px", color: "#8c96b6", margin: "16px 0 0 0" }}>
              Final Score: {gameState?.player1?.score || 0} - {gameState?.player2?.score || 0}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
            <button
              onClick={onRestart}
              className={styles.buttonSuccess}
            >
              🎮 Play Again
            </button>
            <button
              onClick={onMainMenu}
              className={styles.buttonSecondary}
            >
              🏠 Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { playerData, matchData } = winScreenData;
  
  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ 
        maxWidth: "600px", 
        margin: "0 auto"
      }}>
        <div className={styles.cardHeader} style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "36px",
            color: playerData.result === 'victory' ? "#34ce57" : "#ff9595",
            margin: 0,
            fontWeight: 700
          }}>
            🎉 {playerData.result?.toUpperCase() || 'GAME OVER'} 🎉
          </h1>
        </div>

        <div className={styles.card} style={{ 
          marginTop: "24px",
          background: "rgba(12, 20, 35, 0.85)",
          padding: "24px"
        }}>
          <h3 style={{ 
            color: "#7ab8ff", 
            marginBottom: "16px",
            fontSize: "18px",
            fontWeight: 600
          }}>
            Match Summary
          </h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Duration:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.duration}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Winner:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.winnerName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Final Score:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.player1Score} - {matchData.player2Score}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Total Volleys:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.totalVolleys}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
          <button
            onClick={onRestart}
            className={styles.buttonSuccess}
          >
            🎮 Play Again
          </button>
          <button
            onClick={onMainMenu}
            className={styles.buttonSecondary}
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
