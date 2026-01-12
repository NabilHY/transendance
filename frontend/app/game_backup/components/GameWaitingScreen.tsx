// Waiting screen component - shows when waiting for opponent

import React from 'react';
import styles from '../styles.module.css';

interface GameWaitingScreenProps {
  onCancel: () => void;
}

export const GameWaitingScreen: React.FC<GameWaitingScreenProps> = ({ onCancel }) => {
  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <div className={styles.cardHeader}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#e4ecff", margin: 0 }}>
            🔍 Looking for opponent...
          </h2>
          <p className={styles.subtitle}>
            Waiting for another player to join the match
          </p>
        </div>
        
        <div style={{ 
          marginBottom: "24px",
          padding: "32px",
          border: "2px dashed #2f8cff",
          borderRadius: "16px",
          background: "rgba(47, 140, 255, 0.05)"
        }}>
          <div className={styles.loadingSpinner} style={{ marginBottom: "20px" }}></div>
          <p style={{ color: "#8c96b6", fontSize: "15px", margin: 0 }}>
            Searching for players...
          </p>
        </div>
        
        <button
          onClick={onCancel}
          className={styles.buttonDanger}
        >
          Cancel Matchmaking
        </button>
      </div>
    </div>
  );
};
