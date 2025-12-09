// Active game screen component - shows the game canvas and score

import React, { useRef, useEffect } from 'react';
import { renderGame } from '../utils/canvas';
import styles from '../styles.module.css';
import type { GameState, PlayerInfo } from '../types';

interface GameScreenProps {
  gameState: GameState | null;
  playerInfo: PlayerInfo | null;
  isConnected: boolean;
}

export const GameScreen: React.FC<GameScreenProps> = ({ gameState, playerInfo, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (gameState && canvasRef.current) {
      renderGame(canvasRef.current, gameState, playerInfo);
    }
  }, [gameState, playerInfo]);

  return (
    <div className={styles.container}>
      <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
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
