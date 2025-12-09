// Tournament match ready screen component

import React from 'react';
import type { MatchReadyInfo, PlayerInfo } from '../types';

interface GameTournamentMatchReadyScreenProps {
  matchReadyInfo: MatchReadyInfo;
  playerInfo: PlayerInfo | null;
}

export const GameTournamentMatchReadyScreen: React.FC<GameTournamentMatchReadyScreenProps> = ({
  matchReadyInfo,
  playerInfo
}) => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "400px",
      padding: "40px"
    }}>
      <h2 style={{ 
        fontSize: "36px", 
        color: "#ffc107", 
        marginBottom: "30px"
      }}>
        🎮 Match Ready!
      </h2>
      
      <div style={{
        backgroundColor: "#1a1a1a",
        border: "3px solid #ffc107",
        borderRadius: "15px",
        padding: "40px",
        textAlign: "center",
        maxWidth: "600px",
        width: "100%"
      }}>
        <div style={{ fontSize: "20px", marginBottom: "30px", color: "#ccc" }}>
          <strong style={{ color: "#ffc107" }}>
            {matchReadyInfo.round === 'quarter_finals' ? 'Quarter Finals' : 
             matchReadyInfo.round === 'semi_finals' ? 'Semi Finals' : 'Finals'}
          </strong>
        </div>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          fontSize: "24px",
          marginBottom: "40px"
        }}>
          <div style={{ 
            flex: 1, 
            padding: "20px",
            backgroundColor: "#28a745",
            borderRadius: "10px"
          }}>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "10px" }}>YOU</div>
            <div style={{ fontSize: "28px", fontWeight: "bold" }}>
              {playerInfo?.username || "Player"}
            </div>
          </div>
          
          <div style={{ 
            margin: "0 30px", 
            fontSize: "40px", 
            color: "#ffc107"
          }}>
            VS
          </div>
          
          <div style={{ 
            flex: 1, 
            padding: "20px",
            backgroundColor: "#dc3545",
            borderRadius: "10px"
          }}>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "10px" }}>OPPONENT</div>
            <div style={{ fontSize: "28px", fontWeight: "bold" }}>
              {matchReadyInfo.opponent?.username || "Opponent"}
            </div>
          </div>
        </div>
        
        <div style={{ 
          fontSize: "18px", 
          color: "#17a2b8"
        }}>
          ⏳ Game starting in 3 seconds...
        </div>
      </div>
    </div>
  );
};

