// Active game screen component - shows the game canvas and score

import React, { useRef, useEffect } from 'react';
import { renderGame } from '../utils/canvas';
import { getRankInfo } from '../utils/rank';
import styles from '../styles.module.css';
import type { GameState, PlayerInfo, PlayerStats } from '../types';

interface GameScreenProps {
  gameState: GameState | null;
  playerInfo: PlayerInfo | null;
  isConnected: boolean;
  playerStats: PlayerStats | null;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameState, playerInfo, isConnected, playerStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (gameState && canvasRef.current) {
      renderGame(canvasRef.current, gameState, playerInfo ?? undefined);
    }
  }, [gameState, playerInfo]);

  return (
    <div className={styles.container}>
      <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        {/* Player Stats Display */}
        {playerStats && (
          <div style={{ 
            marginBottom: "16px",
            padding: "12px 16px",
            background: "rgba(12, 20, 35, 0.6)",
            borderRadius: "12px",
            border: "1px solid #1b253f"
          }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", 
              gap: "12px"
            }}>
              {(() => {
                const rankInfo = getRankInfo(playerStats.rank_points);
                return (
                  <div className={styles.statCard} style={{ 
                    borderColor: rankInfo.color,
                    padding: "10px",
                    margin: 0
                  }}>
                    <div className={styles.statLabel}>Rank</div>
                    <div className={styles.statValue} style={{ 
                      color: rankInfo.color,
                      fontSize: "16px"
                    }}>
                      {rankInfo.tier} {rankInfo.level}
                    </div>
                    <div className={styles.statSubtext}>
                      {playerStats.rank_points} RP
                    </div>
                  </div>
                );
              })()}
              
              <div className={styles.statCard} style={{ padding: "10px", margin: 0 }}>
                <div className={styles.statLabel}>Level</div>
                <div className={styles.statValue} style={{ 
                  color: "#7ab8ff",
                  fontSize: "16px"
                }}>
                  {playerStats.player_level}
                </div>
                <div className={styles.statSubtext}>
                  {playerStats.experience_points} XP
                </div>
              </div>

              <div className={styles.statCard} style={{ padding: "10px", margin: 0 }}>
                <div className={styles.statLabel}>Record</div>
                <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                  <span style={{ color: "#34ce57" }}>{playerStats.games_won}W</span>
                  <span style={{ color: "#6b7593" }}> - </span>
                  <span style={{ color: "#ff9595" }}>{playerStats.games_lost || 0}L</span>
                </div>
                <div className={styles.statSubtext}>
                  {playerStats.win_rate?.toFixed(1) || 0}% WR
                </div>
              </div>

              <div className={styles.statCard} style={{ padding: "10px", margin: 0 }}>
                <div className={styles.statLabel}>Streak</div>
                <div className={styles.statValue} style={{ 
                  color: playerStats.current_streak > 0 ? "#ffc107" : playerStats.current_streak < 0 ? "#ff9595" : "#8c96b6",
                  fontSize: "16px"
                }}>
                  {playerStats.current_streak || 0}
                </div>
                <div className={styles.statSubtext}>
                  {playerStats.current_streak > 0 ? 'Win' : playerStats.current_streak < 0 ? 'Loss' : 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.scoreContainer}>
          <div className={styles.scoreItem}>
            <div className={styles.scoreLabel}>Player 1</div>
            <div className={styles.scoreValue}>{gameState?.player1?.score || 0}</div>
            <div className={styles.playerName}>
              {playerInfo?.role === 'player1' 
                ? `👤 ${playerInfo?.user?.username || 'You'}` 
                : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
            </div>
          </div>
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: "8px" 
          }}>
            <span className={styles.badge}>
              {playerInfo?.gameType === 'solo' ? "Practice Mode" : `Multiplayer - ${playerInfo?.role}`}
            </span>
            <div style={{
              fontSize: "12px", 
              color: isConnected ? "#34ce57" : "#ff9595",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span style={{
                width: "8px", 
                height: "8px", 
                borderRadius: "50%", 
                background: isConnected ? "#34ce57" : "#ff9595",
                display: "inline-block"
              }}></span>
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>
          
          <div className={styles.scoreItemRight}>
            <div className={styles.scoreLabel} style={{ textAlign: "right" }}>Player 2</div>
            <div className={styles.scoreValue} style={{ textAlign: "right" }}>
              {gameState?.player2?.score || 0}
            </div>
            <div className={styles.playerName} style={{ textAlign: "right" }}>
              {playerInfo?.role === 'player2' 
                ? `👤 ${playerInfo?.user?.username || 'You'}` 
                : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
            </div>
          </div>
        </div>
        
        <div style={{ 
          textAlign: "center", 
          marginBottom: "16px",
          padding: "12px",
          background: "rgba(12, 20, 35, 0.5)",
          borderRadius: "12px",
          border: "1px solid #1b253f"
        }}>
          <p style={{ 
            fontSize: "13px", 
            color: "#8c96b6",
            margin: 0
          }}>
            {playerInfo?.role === 'player1' && "Your paddle (Left): W/S or ↑/↓"}
            {playerInfo?.role === 'player2' && "Your paddle (Right): W/S or ↑/↓"}
            {playerInfo?.role === 'both' && "Left paddle: W/S | Right paddle: ↑/↓"}
          </p>
        </div>
        
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={400} 
          className={styles.gameCanvas}
        />
      </div>
    </div>
  );
};
