// Quadra Pong Waiting Screen - shows player queue progress

import React from 'react';
import styles from '../styles.module.css';
import type { QuadWaitingInfo } from '../types';

interface GameQuadWaitingScreenProps {
  quadWaitingInfo: QuadWaitingInfo | null;
  onCancel: () => void;
}

export const GameQuadWaitingScreen: React.FC<GameQuadWaitingScreenProps> = ({
  quadWaitingInfo,
  onCancel
}) => {
  const playersWaiting = quadWaitingInfo?.totalWaiting || 0;
  const playersNeeded = 4 - playersWaiting;

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
        <div className={styles.cardHeader}>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#7ab8ff" }}>
            🎯 Finding Players...
          </h2>
          <p style={{ fontSize: "16px", color: "#8c96b6", margin: "8px 0 0 0" }}>
            Quadra Pong Matchmaking
          </p>
        </div>
        
        <div style={{ 
          padding: "32px 24px",
          background: "rgba(47, 140, 255, 0.1)",
          borderRadius: "16px",
          margin: "24px 0",
          border: "2px solid rgba(47, 140, 255, 0.2)"
        }}>
          <div style={{ 
            fontSize: "48px", 
            fontWeight: 700, 
            color: "#2f8cff",
            marginBottom: "12px"
          }}>
            {playersWaiting} / 4
          </div>
          <div style={{ 
            fontSize: "16px", 
            color: "#7ab8ff",
            marginBottom: "20px"
          }}>
            Players in Queue
          </div>

          {/* Player slots visualization */}
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            justifyContent: "center",
            marginTop: "24px"
          }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: i < playersWaiting ? 
                    "linear-gradient(135deg, #2f8cff 0%, #7ab8ff 100%)" : 
                    "rgba(140, 150, 182, 0.2)",
                  border: i < playersWaiting ?
                    "3px solid #2f8cff" :
                    "3px solid rgba(140, 150, 182, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  transition: "all 0.3s ease"
                }}
              >
                {i < playersWaiting ? "✓" : "?"}
              </div>
            ))}
          </div>

          {playersNeeded > 0 && (
            <div style={{
              marginTop: "24px",
              padding: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#8c96b6"
            }}>
              Waiting for {playersNeeded} more {playersNeeded === 1 ? 'player' : 'players'}...
            </div>
          )}
        </div>

        <div style={{ marginTop: "24px" }}>
          <p style={{ 
            fontSize: "14px", 
            color: "#8c96b6",
            marginBottom: "16px",
            lineHeight: "1.6"
          }}>
            <strong style={{ color: "#7ab8ff" }}>How it works:</strong><br />
            You'll be placed in a 2v2 team match.<br />
            Teams will be assigned when all 4 players join.
          </p>
        </div>

        <div style={{ marginTop: "24px" }}>
          <button
            onClick={onCancel}
            className={styles.button}
            style={{
              background: "rgba(255, 68, 68, 0.2)",
              border: "2px solid rgba(255, 68, 68, 0.3)",
              color: "#ff9595",
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 68, 68, 0.3)";
              e.currentTarget.style.borderColor = "#ff4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 68, 68, 0.2)";
              e.currentTarget.style.borderColor = "rgba(255, 68, 68, 0.3)";
            }}
          >
            Cancel Matchmaking
          </button>
        </div>

        {/* Animated loading indicator */}
        <div style={{ marginTop: "32px" }}>
          <div style={{
            display: "inline-flex",
            gap: "8px"
          }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#2f8cff",
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.6
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};
