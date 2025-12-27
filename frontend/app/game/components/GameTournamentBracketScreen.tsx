// Tournament Bracket Overview Screen - Shows matches and potential opponents

import React from 'react';
import { Trophy, Swords, User, ArrowRight } from 'lucide-react';
import styles from '../styles.module.css';

interface TournamentMatch {
  matchId: string;
  player1: {
    id: number;
    username: string;
    avatar?: string;
  };
  player2: {
    id: number;
    username: string;
    avatar?: string;
  };
}

interface TournamentBracketData {
  currentRound: string; // 'quarter', 'semi', 'final'
  matches: TournamentMatch[];
  yourMatchId: string;
  potentialOpponents?: {
    matchId: string;
    player1: { username: string; avatar?: string };
    player2: { username: string; avatar?: string };
  };
}

interface GameTournamentBracketScreenProps {
  bracketData: TournamentBracketData;
  userId: number;
}

export const GameTournamentBracketScreen: React.FC<GameTournamentBracketScreenProps> = ({
  bracketData,
  userId
}) => {
  const getRoundTitle = (round: string) => {
    switch (round) {
      case 'quarter':
        return 'Quarter Finals';
      case 'semi':
        return 'Semi Finals';
      case 'final':
        return 'Finals';
      default:
        return 'Tournament';
    }
  };

  const getNextRoundTitle = (round: string) => {
    switch (round) {
      case 'quarter':
        return 'Semi Finals';
      case 'semi':
        return 'Finals';
      default:
        return 'Championship';
    }
  };

  // Find your match
  const yourMatch = bracketData.matches.find(
    (m) => m.player1.id === userId || m.player2.id === userId
  );

  const isYouPlayer1 = yourMatch?.player1.id === userId;
  const yourOpponent = isYouPlayer1 ? yourMatch?.player2 : yourMatch?.player1;

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className={styles.cardHeader} style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 36px)',
            background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            fontWeight: 700,
            fontFamily: "'Orbitron', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <Trophy size={32} /> {getRoundTitle(bracketData.currentRound)} <Trophy size={32} />
          </h1>
          <p style={{
            color: 'var(--neon-blue)',
            fontSize: '16px',
            marginTop: '12px',
            fontWeight: 600
          }}>
            Tournament Bracket Overview
          </p>
        </div>

        {/* Your Match Section */}
        {yourMatch && (
          <div style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '2px solid var(--neon-blue)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)'
          }}>
            <h2 style={{
              fontSize: '20px',
              color: 'var(--neon-blue)',
              margin: '0 0 20px 0',
              fontFamily: "'Orbitron', sans-serif",
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Swords size={20} /> Your Match
            </h2>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap'
            }}>
              {/* You */}
              <div style={{
                flex: '1',
                minWidth: '180px',
                maxWidth: '220px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--neon-green), var(--neon-blue))',
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--neon-green)',
                  boxShadow: '0 0 20px var(--neon-green)'
                }}>
                  <User size={40} color="white" />
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--neon-green)',
                  fontFamily: "'Orbitron', sans-serif"
                }}>
                  YOU
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#8c96b6',
                  marginTop: '4px'
                }}>
                  {isYouPlayer1 ? yourMatch.player1.username : yourMatch.player2.username}
                </div>
              </div>

              {/* VS */}
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--neon-pink)',
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 0 10px var(--neon-pink)'
              }}>
                VS
              </div>

              {/* Opponent */}
              <div style={{
                flex: '1',
                minWidth: '180px',
                maxWidth: '220px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--neon-pink), var(--neon-purple))',
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--neon-pink)',
                  boxShadow: '0 0 20px var(--neon-pink)'
                }}>
                  <User size={40} color="white" />
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--neon-pink)',
                  fontFamily: "'Orbitron', sans-serif"
                }}>
                  {yourOpponent?.username || 'Opponent'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Matches Section */}
        {bracketData.matches.length > 1 && (
          <div style={{
            background: 'rgba(15, 20, 35, 0.6)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              color: 'var(--neon-purple)',
              margin: '0 0 20px 0',
              fontFamily: "'Orbitron', sans-serif",
              textAlign: 'center'
            }}>
              Other {getRoundTitle(bracketData.currentRound)} Matches
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {bracketData.matches
                .filter((m) => m.matchId !== yourMatch?.matchId)
                .map((match) => (
                  <div
                    key={match.matchId}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(183, 68, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: '#e8f0ff', fontWeight: 600 }}>
                        {match.player1.username}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--neon-purple)',
                      fontWeight: 700
                    }}>
                      VS
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', color: '#e8f0ff', fontWeight: 600 }}>
                        {match.player2.username}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Next Round Preview */}
        {bracketData.potentialOpponents && bracketData.currentRound !== 'final' && (
          <div style={{
            background: 'rgba(183, 68, 255, 0.1)',
            border: '1px solid rgba(183, 68, 255, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <ArrowRight size={20} color="var(--neon-purple)" />
              <h3 style={{
                fontSize: '16px',
                color: 'var(--neon-purple)',
                margin: 0,
                fontFamily: "'Orbitron', sans-serif"
              }}>
                Potential {getNextRoundTitle(bracketData.currentRound)} Opponent
              </h3>
              <ArrowRight size={20} color="var(--neon-purple)" />
            </div>
            <p style={{
              fontSize: '14px',
              color: '#8c96b6',
              margin: 0
            }}>
              Winner of {bracketData.potentialOpponents.player1.username} vs {bracketData.potentialOpponents.player2.username}
            </p>
          </div>
        )}

        {/* Ready Message */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          padding: '20px',
          background: 'rgba(0, 240, 255, 0.05)',
          borderRadius: '12px'
        }}>
          <p style={{
            fontSize: '18px',
            color: 'var(--neon-green)',
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Orbitron', sans-serif"
          }}>
            ⚔️ Get Ready! Match starting soon... ⚔️
          </p>
        </div>
      </div>
    </div>
  );
};
