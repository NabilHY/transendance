// Waiting screen component - shows when waiting for opponent

import React from 'react';

interface GameWaitingScreenProps {
  onCancel: () => void;
}

export const GameWaitingScreen: React.FC<GameWaitingScreenProps> = ({ onCancel }) => {
  return (
    <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
      <h2>🔍 Looking for opponent...</h2>
      <div style={{ 
        marginBottom: "20px",
        padding: "20px",
        border: "2px dashed #ffc107",
        borderRadius: "10px"
      }}>
        <p>Waiting for another player to join...</p>
        <div style={{ 
          width: "50px", 
          height: "50px", 
          border: "3px solid #ffc107", 
          borderTop: "3px solid transparent", 
          borderRadius: "50%", 
          animation: "game-spin 1s linear infinite",
          margin: "10px auto"
        }}></div>
      </div>
      <button
        onClick={onCancel}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          backgroundColor: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Cancel
      </button>
    </div>
  );
};

