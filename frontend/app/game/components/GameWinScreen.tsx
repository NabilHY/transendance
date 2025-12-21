// Win screen component - shows game results and stats

import React, { useEffect } from 'react';
import { Trophy, Gamepad2, Home, BarChart3 } from 'lucide-react';
import { useGameSounds } from '../hooks/useGameSounds';
import styles from '../styles.module.css';
import type { WinScreenData, QuadWinScreenData, GameState } from '../types';

interface GameWinScreenProps {
  winScreenData: WinScreenData | null;
  quadWinScreenData?: QuadWinScreenData | null;
  gameState: GameState | null;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameWinScreen: React.FC<GameWinScreenProps> = ({
  winScreenData,
  quadWinScreenData,
  gameState,
  onRestart,
  onMainMenu
}) => {
  const sounds = useGameSounds({ enabled: true, volume: 0.6 });

  // Play win/loss sound when screen mounts
  useEffect(() => {
    const isWinner = quadWinScreenData?.won ?? winScreenData?.playerData?.won ?? false;
    if (isWinner) {
      sounds.playWin();
    } else {
      sounds.playLoss();
    }
  }, []);  // Only run once on mount
  // Handle quad mode win screen
  if (quadWinScreenData) {
    const isWinner = quadWinScreenData.won;
    const stats = quadWinScreenData.stats;
    const yourTeam = quadWinScreenData.team === 'team1' ? 1 : 2;
    const winningTeam = quadWinScreenData.finalScore.team1 > quadWinScreenData.finalScore.team2 ? 1 : 2;
    
    const winRate = stats?.totalMatches && stats.totalMatches > 0 
      ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) 
      : '0.0';
    
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ 
          maxWidth: "700px", 
          margin: "0 auto",
          borderColor: isWinner ? "#34ce57" : "#ff9595"
        }}>
          <div className={styles.cardHeader} style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "36px",
              color: isWinner ? "#34ce57" : "#ff9595",
              margin: 0,
              fontWeight: 700
            }}>
              {isWinner ? "🎉 VICTORY! 🎉" : "💔 DEFEAT 💔"}
            </h1>
            <p style={{ fontSize: "18px", color: "#8c96b6", margin: "12px 0 0 0" }}>
              <strong>{winningTeam === 1 ? "Team 1 (Blue)" : "Team 2 (Green)"}</strong> Wins!
            </p>
            <p style={{ fontSize: "16px", color: "#6b7593", margin: "8px 0 0 0" }}>
              Score: {quadWinScreenData.finalScore.team1} - {quadWinScreenData.finalScore.team2}
            </p>
          </div>
          
          {/* Team Display */}
          <div className={styles.card} style={{ 
            marginTop: "24px",
            background: "rgba(12, 20, 35, 0.85)",
            padding: "24px"
          }}>
            <h3 style={{ 
              color: "#7ab8ff", 
              marginTop: 0, 
              marginBottom: "20px",
              fontSize: "18px",
              fontWeight: 600
            }}>
              👥 Teams
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Your Team */}
              <div style={{
                padding: "16px",
                background: yourTeam === 1 ? "rgba(47, 140, 255, 0.1)" : "rgba(52, 206, 87, 0.1)",
                borderRadius: "12px",
                border: `2px solid ${yourTeam === 1 ? "rgba(47, 140, 255, 0.3)" : "rgba(52, 206, 87, 0.3)"}`
              }}>
                <div style={{ 
                  fontSize: "16px", 
                  color: yourTeam === 1 ? "#2f8cff" : "#34ce57", 
                  fontWeight: 700,
                  marginBottom: "12px",
                  textAlign: "center"
                }}>
                  Your Team ({yourTeam === 1 ? "Blue" : "Green"})
                </div>
                {quadWinScreenData.teammates.map((teammate: { username: string; id: number }, idx: number) => (
                  <div key={idx} style={{
                    padding: "8px",
                    background: "rgba(5, 11, 22, 0.5)",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#e4ecff"
                  }}>
                    👤 {teammate.username}
                  </div>
                ))}
              </div>
              
              {/* Opponent Team */}
              <div style={{
                padding: "16px",
                background: yourTeam === 2 ? "rgba(47, 140, 255, 0.1)" : "rgba(52, 206, 87, 0.1)",
                borderRadius: "12px",
                border: `2px solid ${yourTeam === 2 ? "rgba(47, 140, 255, 0.3)" : "rgba(52, 206, 87, 0.3)"}`
              }}>
                <div style={{ 
                  fontSize: "16px", 
                  color: yourTeam === 2 ? "#2f8cff" : "#34ce57", 
                  fontWeight: 700,
                  marginBottom: "12px",
                  textAlign: "center"
                }}>
                  Opponents ({yourTeam === 2 ? "Blue" : "Green"})
                </div>
                {quadWinScreenData.opponents.map((opponent: { username: string; id: number }, idx: number) => (
                  <div key={idx} style={{
                    padding: "8px",
                    background: "rgba(5, 11, 22, 0.5)",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#e4ecff"
                  }}>
                    👤 {opponent.username}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Stats Update */}
          {stats && (
            <div className={styles.card} style={{ 
              marginTop: "24px",
              background: "rgba(12, 20, 35, 0.85)",
              padding: "24px"
            }}>
              <h3 style={{ 
                color: "#7ab8ff", 
                marginTop: 0, 
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                <BarChart3 size={20} /> Your Stats Update
              </h3>
              
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "#050b16",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "1px solid #1b253f"
              }}>
                <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Ranked Rating</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldRating}</span>
                  <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                  <span style={{ 
                    fontSize: "18px", 
                    color: (stats.newRating - stats.oldRating) >= 0 ? "#34ce57" : "#ff9595",
                    fontWeight: 700
                  }}>
                    {stats.newRating} ({(stats.newRating - stats.oldRating) >= 0 ? '+' : ''}{stats.newRating - stats.oldRating})
                  </span>
                </div>
              </div>
              
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "#050b16",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "1px solid #1b253f"
              }}>
                <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Experience</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldXp}</span>
                  <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                  <span style={{ fontSize: "18px", color: "#7ab8ff", fontWeight: 700 }}>
                    {stats.newXp} (+{stats.newXp - stats.oldXp})
                  </span>
                </div>
              </div>
              
              {stats.newLevel && stats.oldLevel && stats.newLevel > stats.oldLevel && (
                <div style={{
                  padding: "16px",
                  background: "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2))",
                  borderRadius: "12px",
                  marginBottom: "12px",
                  border: "2px solid rgba(255, 193, 7, 0.4)"
                }}>
                  <span style={{ fontSize: "16px", color: "#ffc107", fontWeight: 700 }}>
                    🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
                  </span>
                </div>
              )}
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginTop: "16px"
              }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Matches</div>
                  <div className={styles.statValue}>{stats.totalMatches}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Wins</div>
                  <div className={styles.statValue} style={{ color: "#34ce57" }}>{stats.wins}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Win Rate</div>
                  <div className={styles.statValue} style={{ color: "#7ab8ff" }}>{winRate}%</div>
                </div>
              </div>
            </div>
          )}
          
          <div style={{ 
            display: "flex", 
            gap: "16px", 
            marginTop: "24px",
            justifyContent: "center"
          }}>
            <button onClick={onMainMenu} className={styles.button}>
              <Home size={20} /> Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (winScreenData?.isTournament) {
    const { playerData, matchData } = winScreenData;
    const isWinner = playerData.won;
    const isChampion = matchData.isTournamentWinner;
    const waitingForNext = matchData.waitingForNextRound;
    const stats = playerData.stats;
    
    const winRate = stats && stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : '0.0';
    
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ 
          maxWidth: "700px", 
          margin: "0 auto",
          borderColor: isWinner ? "#34ce57" : "#ff9595"
        }}>
          <div className={styles.cardHeader} style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "36px",
              color: isChampion ? "#ffc107" : isWinner ? "#34ce57" : "#ff9595",
              margin: 0,
              fontWeight: 700
            }}>
              {isChampion ? "👑 TOURNAMENT CHAMPION! 👑" : 
               isWinner ? "🎉 VICTORY! 🎉" : 
               "💔 ELIMINATED 💔"}
            </h1>
            <p style={{ fontSize: "16px", color: "#8c96b6", margin: "12px 0 0 0" }}>
              <strong>vs</strong> {playerData.opponent}
            </p>
          </div>
          
          {stats && (
            <div className={styles.card} style={{ 
              marginTop: "24px",
              background: "rgba(12, 20, 35, 0.85)",
              padding: "24px"
            }}>
              <h3 style={{ 
                color: "#7ab8ff", 
                marginTop: 0, 
                marginBottom: "20px",
                fontSize: "18px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                <BarChart3 size={20} /> Stats Update
              </h3>
              
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "#050b16",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "1px solid #1b253f"
              }}>
                <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Ranked Rating</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldRating}</span>
                  <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                  <span style={{ 
                    fontSize: "18px", 
                    color: (playerData.ratingChange ?? 0) >= 0 ? "#34ce57" : "#ff9595",
                    fontWeight: 700
                  }}>
                    {stats.newRating} ({(playerData.ratingChange ?? 0) >= 0 ? '+' : ''}{playerData.ratingChange ?? 0})
                  </span>
                </div>
              </div>
              
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "#050b16",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "1px solid #1b253f"
              }}>
                <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Experience</span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldXp}</span>
                  <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                  <span style={{ fontSize: "18px", color: "#7ab8ff", fontWeight: 700 }}>
                    {stats.newXp} (+{playerData.xpGain})
                  </span>
                </div>
              </div>
              
              {stats.newLevel > stats.oldLevel && (
                <div style={{
                  padding: "16px",
                  background: "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2))",
                  borderRadius: "12px",
                  marginBottom: "12px",
                  border: "2px solid rgba(255, 193, 7, 0.4)"
                }}>
                  <span style={{ fontSize: "16px", color: "#ffc107", fontWeight: 700 }}>
                    🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
                  </span>
                </div>
              )}
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                marginTop: "16px"
              }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Matches</div>
                  <div className={styles.statValue}>{stats.totalMatches}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Wins</div>
                  <div className={styles.statValue} style={{ color: "#34ce57" }}>{stats.wins}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Win Rate</div>
                  <div className={styles.statValue} style={{ color: "#7ab8ff" }}>{winRate}%</div>
                </div>
              </div>
            </div>
          )}
          
          {isChampion && (
            <div style={{
              background: "rgba(255, 193, 7, 0.1)",
              padding: "20px",
              borderRadius: "16px",
              marginTop: "24px",
              border: "2px solid rgba(255, 193, 7, 0.3)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "20px", color: "#ffc107", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <Trophy size={24} /> You are the Tournament Champion! <Trophy size={24} />
              </p>
            </div>
          )}
          
          {isWinner && waitingForNext && !isChampion && (
            <div style={{
              background: "rgba(52, 206, 87, 0.1)",
              padding: "16px",
              borderRadius: "12px",
              marginTop: "24px",
              border: "1px solid rgba(52, 206, 87, 0.3)",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "16px", color: "#34ce57", fontWeight: 600, margin: 0 }}>
                ✅ You've Advanced to the Next Round!
              </p>
            </div>
          )}
          
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
            {isWinner && waitingForNext ? (
              <div style={{
                textAlign: "center",
                padding: "20px"
              }}>
                <p style={{ fontSize: "18px", color: "var(--neon-blue)", fontWeight: 600, margin: 0 }}>
                  🎮 Waiting for other matches to complete...
                </p>
              </div>
            ) : (
              <button
                onClick={onMainMenu}
                className={styles.button}
              >
                <Home size={20} /> Return to Main Menu
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!winScreenData) {
    return (
      <div className={styles.container}>
        <div className={styles.card} style={{ 
          maxWidth: "600px", 
          margin: "0 auto",
          textAlign: "center"
        }}>
          <div className={styles.cardHeader}>
            <h1 style={{
              fontSize: "36px",
              color: gameState?.winner === 'Player 1' ? "#34ce57" : "#ff9595",
              margin: 0,
              fontWeight: 700
            }}>
              🎉 {gameState?.winner} Wins! 🎉
            </h1>
            <p style={{ fontSize: "18px", color: "#8c96b6", margin: "16px 0 0 0" }}>
              Final Score: {gameState?.player1?.score || 0} - {gameState?.player2?.score || 0}
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
            <button
              onClick={onRestart}
              className={styles.buttonSuccess}
            >
              <Gamepad2 size={20} /> Play Again
            </button>
            <button
              onClick={onMainMenu}
              className={styles.buttonSecondary}
            >
              <Home size={20} /> Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { playerData, matchData } = winScreenData;
  const isWinner = playerData.won;
  const stats = playerData.stats;
  
  const winRate = stats && stats.totalMatches > 0 
    ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) 
    : '0.0';
  
  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ 
        maxWidth: "700px", 
        margin: "0 auto",
        borderColor: isWinner ? "#34ce57" : "#ff9595"
      }}>
        <div className={styles.cardHeader} style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: "36px",
            color: isWinner ? "#34ce57" : "#ff9595",
            margin: 0,
            fontWeight: 700
          }}>
            {isWinner ? "🎉 VICTORY! 🎉" : "💔 DEFEAT 💔"}
          </h1>
          <p style={{ fontSize: "16px", color: "#8c96b6", margin: "12px 0 0 0" }}>
            <strong>vs</strong> {playerData.opponent}
          </p>
          <p style={{ fontSize: "16px", color: "#6b7593", margin: "8px 0 0 0" }}>
            Final Score: {matchData.player1Score} - {matchData.player2Score}
          </p>
        </div>

        {/* Stats Update */}
        {stats && (
          <div className={styles.card} style={{ 
            marginTop: "24px",
            background: "rgba(12, 20, 35, 0.85)",
            padding: "24px"
          }}>
            <h3 style={{ 
              color: "#7ab8ff", 
              marginTop: 0, 
              marginBottom: "20px",
              fontSize: "18px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <BarChart3 size={20} /> Stats Update
            </h3>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "#050b16",
              borderRadius: "12px",
              marginBottom: "12px",
              border: "1px solid #1b253f"
            }}>
              <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Ranked Rating</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldRating}</span>
                <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                <span style={{ 
                  fontSize: "18px", 
                  color: (stats.newRating - stats.oldRating) >= 0 ? "#34ce57" : "#ff9595",
                  fontWeight: 700
                }}>
                  {stats.newRating} ({(stats.newRating - stats.oldRating) >= 0 ? '+' : ''}{stats.newRating - stats.oldRating})
                </span>
              </div>
            </div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "#050b16",
              borderRadius: "12px",
              marginBottom: "12px",
              border: "1px solid #1b253f"
            }}>
              <span style={{ fontSize: "14px", color: "#8c96b6", fontWeight: 500 }}>Experience</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "16px", color: "#e4ecff" }}>{stats.oldXp}</span>
                <span style={{ fontSize: "18px", color: "#6b7593" }}>→</span>
                <span style={{ fontSize: "18px", color: "#7ab8ff", fontWeight: 700 }}>
                  {stats.newXp} (+{stats.newXp - stats.oldXp})
                </span>
              </div>
            </div>
            
            {stats.newLevel && stats.oldLevel && stats.newLevel > stats.oldLevel && (
              <div style={{
                padding: "16px",
                background: "linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2))",
                borderRadius: "12px",
                marginBottom: "12px",
                border: "2px solid rgba(255, 193, 7, 0.4)"
              }}>
                <span style={{ fontSize: "16px", color: "#ffc107", fontWeight: 700 }}>
                  🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
                </span>
              </div>
            )}
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              marginTop: "16px"
            }}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Matches</div>
                <div className={styles.statValue}>{stats.totalMatches}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Wins</div>
                <div className={styles.statValue} style={{ color: "#34ce57" }}>{stats.wins}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Win Rate</div>
                <div className={styles.statValue} style={{ color: "#7ab8ff" }}>{winRate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Match Summary */}
        <div className={styles.card} style={{ 
          marginTop: "24px",
          background: "rgba(12, 20, 35, 0.85)",
          padding: "24px"
        }}>
          <h3 style={{ 
            color: "#7ab8ff", 
            marginTop: 0,
            marginBottom: "16px",
            fontSize: "18px",
            fontWeight: 600
          }}>
            📋 Match Summary
          </h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Duration:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.duration}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8c96b6", fontSize: "14px" }}><strong>Winner:</strong></span>
            <span style={{ color: "#e4ecff", fontSize: "14px" }}>{matchData.winnerName}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
          <button
            onClick={onMainMenu}
            className={styles.button}
          >
            <Home size={20} /> Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
