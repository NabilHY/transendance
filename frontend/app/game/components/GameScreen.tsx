// Active game screen component - shows the game canvas and score

import React, { useRef, useEffect } from 'react';
import { renderGame } from '../utils/canvas';
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
    <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontWeight: "bold" }}>Player 1: {gameState?.player1?.score || 0}</div>
            <div style={{ fontSize: "12px", color: "#aaa" }}>
              {playerInfo?.role === 'player1' 
                ? `👤 ${playerInfo?.user?.username || 'You'}` 
                : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
            </div>
          </div>
          <span style={{ 
            padding: "2px 8px", 
            backgroundColor: playerInfo?.gameType === 'solo' ? "#ffc107" : "#17a2b8",
            borderRadius: "12px", 
            fontSize: "12px" 
          }}>
            {playerInfo?.gameType === 'solo' ? "Practice Mode" : `Multiplayer - You are ${playerInfo?.role}`}
          </span>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontWeight: "bold" }}>Player 2: {gameState?.player2?.score || 0}</div>
            <div style={{ fontSize: "12px", color: "#aaa" }}>
              {playerInfo?.role === 'player2' 
                ? `👤 ${playerInfo?.user?.username || 'You'}` 
                : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
            </div>
          </div>
        </div>
        
        <p>Connection: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        
        <p style={{ fontSize: "12px" }}>
          {playerInfo?.role === 'player1' && "Your paddle (Left): W/S or ↑/↓"}
          {playerInfo?.role === 'player2' && "Your paddle (Right): W/S or ↑/↓"}
          {playerInfo?.role === 'both' && "Left paddle: W/S | Right paddle: ↑/↓"}
        </p>
      </div>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={400} 
        style={{ border: "2px solid white", display: "block", margin: "0 auto" }} 
      />
    </div>
  );
};

