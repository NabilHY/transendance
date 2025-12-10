// Tournament waiting screen component

import React from 'react';
import styles from '../styles.module.css';
import type { TournamentQueue } from '../types';

interface GameTournamentWaitingScreenProps {
  tournamentQueue: TournamentQueue | null;
  tournamentBracket: any;
  onCancel: () => void;
}

export const GameTournamentWaitingScreen: React.FC<GameTournamentWaitingScreenProps> = ({
  tournamentQueue,
  tournamentBracket,
  onCancel
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
        <div className={styles.cardHeader}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#e4ecff", margin: 0 }}>
            🏆 Tournament Queue
          </h2>
        </div>
        
        <div style={{ 
          marginBottom: "24px",
          padding: "32px",
          border: "2px solid #2f8cff",
          borderRadius: "16px",
          background: "rgba(47, 140, 255, 0.05)"
        }}>
          {tournamentBracket ? (
            <>
              <h3 style={{ color: "#7ab8ff", marginTop: 0, marginBottom: "12px", fontSize: "18px" }}>
                🎪 Tournament Starting!
              </h3>
              <p style={{ color: "#8c96b6", fontSize: "14px", margin: 0 }}>
                Preparing your match...
              </p>
            </>
          ) : (
            <>
              <h3 style={{ color: "#7ab8ff", marginTop: 0, marginBottom: "12px", fontSize: "18px" }}>
                Waiting for Players... {tournamentQueue?.queueSize || 0}/8
              </h3>
              <p style={{ color: "#8c96b6", fontSize: "14px", margin: 0 }}>
                You are #{tournamentQueue?.queuePosition || 0} in queue
              </p>
            </>
          )}
        </div>
        
        <button
          onClick={onCancel}
          className={styles.buttonDanger}
        >
          Leave Queue
        </button>
      </div>
    </div>
  );
};
