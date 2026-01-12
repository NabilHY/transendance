// Tournament match ready screen component

import React from 'react';
import { Gamepad2, Clock } from 'lucide-react';
import styles from '../styles.module.css';
import type { MatchReadyInfo, PlayerInfo } from '../types';

interface GameTournamentMatchReadyScreenProps {
  matchReadyInfo: MatchReadyInfo;
  playerInfo: PlayerInfo | null;
}

export const GameTournamentMatchReadyScreen: React.FC<GameTournamentMatchReadyScreenProps> = ({
  matchReadyInfo,
  playerInfo
}) => {
  const roundName = matchReadyInfo.round === 'quarter_finals' ? 'Quarter Finals' : 
                   matchReadyInfo.round === 'semi_finals' ? 'Semi Finals' : 'Finals';

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ 
        textAlign: "center", 
        maxWidth: "700px", 
        margin: "0 auto",
        padding: "48px"
      }}>
        <div className={styles.cardHeader}>
          <h2 style={{ fontSize: "32px", fontWeight: 700, color: "#7ab8ff", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <Gamepad2 size={32} /> Match Ready!
          </h2>
          <p style={{ fontSize: "18px", color: "#8c96b6", margin: "8px 0 0 0" }}>
            {roundName}
          </p>
        </div>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          margin: "40px 0",
          gap: "24px"
        }}>
          <div style={{ 
            flex: 1, 
            padding: "24px",
            background: "rgba(52, 206, 87, 0.1)",
            border: "2px solid rgba(52, 206, 87, 0.3)",
            borderRadius: "16px"
          }}>
            <div style={{ fontSize: "12px", color: "#8c96b6", marginBottom: "12px" }}>YOU</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#34ce57" }}>
              {playerInfo?.username || "Player"}
            </div>
          </div>
          
          <div style={{ 
            fontSize: "32px", 
            color: "#2f8cff",
            fontWeight: 700
          }}>
            VS
          </div>
          
          <div style={{ 
            flex: 1, 
            padding: "24px",
            background: "rgba(255, 149, 149, 0.1)",
            border: "2px solid rgba(255, 149, 149, 0.3)",
            borderRadius: "16px"
          }}>
            <div style={{ fontSize: "12px", color: "#8c96b6", marginBottom: "12px" }}>OPPONENT</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#ff9595" }}>
              {matchReadyInfo.opponent?.username || "Opponent"}
            </div>
          </div>
        </div>
        
        <div style={{ 
          fontSize: "16px", 
          color: "#7ab8ff",
          fontWeight: 600,
          padding: "16px",
          background: "rgba(47, 140, 255, 0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(47, 140, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px"
        }}>
          <Clock size={18} /> Game starting in 3 seconds...
        </div>
      </div>
    </div>
  );
};
