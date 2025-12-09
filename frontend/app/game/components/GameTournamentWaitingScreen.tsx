// Tournament waiting screen component

import React from 'react';
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
    <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
      <h2>🏆 Tournament Queue</h2>
      <div style={{ 
        marginBottom: "20px",
        padding: "25px",
        border: "3px solid #ffc107",
        borderRadius: "12px",
        backgroundColor: "#1a1a1a"
      }}>
        {tournamentBracket ? (
          <>
            <h3 style={{ color: "#ffc107", marginTop: 0 }}>
              🎪 Tournament Starting!
            </h3>
            <p style={{ color: "#ccc", fontSize: "14px" }}>
              Preparing your match...
            </p>
          </>
        ) : (
          <>
            <h3 style={{ color: "#ffc107", marginTop: 0 }}>
              Waiting for Players... {tournamentQueue?.queueSize || 0}/8
            </h3>
            <p style={{ color: "#ccc", fontSize: "14px" }}>
              You are #{tournamentQueue?.queuePosition || 0} in queue
            </p>
          </>
        )}
      </div>
      <button
        onClick={onCancel}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Leave Queue
      </button>
    </div>
  );
};

