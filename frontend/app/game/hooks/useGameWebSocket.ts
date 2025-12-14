// Custom hook for WebSocket game connection

import { useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../utils/api';
import type { GameState, QuadGameState, PlayerInfo, GameMode, AIDifficulty, GameScreen as GameScreenType, WebSocketMessage, QuadWaitingInfo, QuadWinScreenData } from '../types';

interface UseGameWebSocketReturn {
  wsRef: React.MutableRefObject<WebSocket | null>;
  isConnected: boolean;
  connect: (gameMode: GameMode, aiDifficulty?: AIDifficulty) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

export const useGameWebSocket = (
  setGameState: (state: GameState | null) => void,
  setScreen: (screen: GameScreenType) => void,
  setPlayerInfo: (info: PlayerInfo | null) => void,
  setAuthError: (error: string | null) => void,
  setIsAuthenticated: (auth: boolean) => void,
  setWinScreenData: (data: any) => void,
  setTournamentQueue: (queue: any) => void,
  setTournamentBracket: (bracket: any) => void,
  setMatchReadyInfo: (info: any) => void,
  tournamentWaitingTimeoutRef: React.MutableRefObject<any>,
  matchReadyCountdownRef: React.MutableRefObject<any>,
  setQuadGameState: (state: QuadGameState | null) => void,
  setQuadWaitingInfo: (info: QuadWaitingInfo | null) => void,
  setQuadWinScreenData: (data: QuadWinScreenData | null) => void
): UseGameWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
    // Clear any pending timeouts
    if (matchReadyCountdownRef.current) {
      clearTimeout(matchReadyCountdownRef.current);
      matchReadyCountdownRef.current = null;
    }
    if (tournamentWaitingTimeoutRef.current) {
      clearTimeout(tournamentWaitingTimeoutRef.current);
      tournamentWaitingTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(async (gameMode: GameMode, aiDifficulty?: AIDifficulty) => {
    // Close existing connection if any
    disconnect();

    // Clear any previous game data
    setWinScreenData(null);
    setQuadWinScreenData(null);

    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      setAuthError('Please log in first.');
      return;
    }

    setAuthError(null);

    // Dynamic WebSocket URL
    const wsUrl = `ws://${window.location.hostname}:4322/ws?token=${encodeURIComponent(token)}`;
    
    console.log(`🔗 Connecting to WebSocket: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket disconnected. Code:", event.code, "Reason:", event.reason);
      setIsConnected(false);
      if (event.code === 1008 || event.code === 4001) {
        setAuthError('Authentication failed. Please check your token.');
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setAuthError('Connection error. Please try again.');
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle different message types
      if (message.type === 'authError') {
        console.error('❌ Authentication error:', message.error);
        setAuthError(message.error || 'Authentication failed. Please log in.');
        setIsConnected(false);
        ws.close();
        return;
      }

      if (message.type === 'authSuccess' || message.type === 'authenticated') {
        console.log('✅ Authentication successful:', message);
        setPlayerInfo(message.user);
        setAuthError(null);
        setIsAuthenticated(true);
        
        const joinMessage: any = { type: "join", gameMode };
        if (gameMode === 'ai' && aiDifficulty) {
          joinMessage.aiDifficulty = aiDifficulty;
        }
        ws.send(JSON.stringify(joinMessage));
      } else if (message.type === 'waiting' || message.type === 'waitingForOpponent') {
        setScreen("waiting");
        setPlayerInfo({ ...message, user: message.user });
      } else if (message.type === 'gameJoined') {
        setScreen("game");
        setPlayerInfo({
          role: message.playerRole,
          roomId: message.roomId,
          gameType: message.gameMode || 'multiplayer',
          opponent: message.opponent,
          user: message.user
        });
        setGameState(message.gameState);
      } else if (message.type === 'tournamentQueued') {
        setScreen("tournamentWaiting");
        setTournamentQueue({
          queuePosition: message.queuePosition,
          queueSize: message.queueSize,
          playerList: message.playerList
        });
      } else if (message.type === 'tournamentStarted') {
        setTournamentBracket(message.bracket);
        setScreen("tournamentWaiting");
      } else if (message.type === 'tournamentMatchReady') {
        if (tournamentWaitingTimeoutRef.current) {
          clearTimeout(tournamentWaitingTimeoutRef.current);
          tournamentWaitingTimeoutRef.current = null;
        }
        
        setMatchReadyInfo({
          opponent: message.opponent,
          playerRole: message.playerRole,
          round: message.round,
          matchId: message.matchId
        });
        setScreen("tournamentMatchReady");
        
        ws.send(JSON.stringify({
          type: 'tournamentMatchReady',
          matchData: message.matchData
        }));
        
        // Clear any existing countdown timeout
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
        }
        
        // Store the countdown timeout so it can be cleared if opponent disconnects
        matchReadyCountdownRef.current = setTimeout(() => {
          matchReadyCountdownRef.current = null;
          setScreen("game");
          setPlayerInfo({
            role: message.playerRole,
            roomId: message.roomId,
            gameType: 'tournament',
            opponent: message.opponent,
            user: message.user,
            tournamentId: message.tournamentId,
            round: message.round
          });
          setGameState(message.gameState);
        }, 3000);
      } else if (message.type === 'tournamentMatchResult') {
        // Clear any pending match ready countdown if we get a result early
        // (e.g., due to opponent disconnection during countdown)
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
          matchReadyCountdownRef.current = null;
          console.log('⏱️ Cleared match ready countdown due to early match result (opponent disconnected)');
        }
        
        setWinScreenData({
          playerData: {
            won: message.won,
            opponent: message.opponentUsername,
            ratingChange: message.ratingChange,
            xpGain: message.xpGain,
            stats: message.stats
          },
          matchData: {
            round: message.round,
            tournamentComplete: message.tournamentComplete,
            isTournamentWinner: message.isTournamentWinner,
            waitingForNextRound: message.waitingForNextRound
          },
          isTournament: true
        });
        setScreen("end");
        
        if (message.won && message.waitingForNextRound) {
          tournamentWaitingTimeoutRef.current = setTimeout(() => {
            setWinScreenData(null);
            setScreen("tournamentWaiting");
          }, 10000);
        }
      } else if (message.type === 'tournamentChampion') {
        alert(`🎉 Congratulations! You are the Tournament Champion!`);
      } else if (message.type === 'gameLeft') {
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
      } else if (message.type === 'playerLeft') {
        alert(message.message);
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
      } else if (message.type === 'matchCancelled') {
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
      } else if (message.type === 'opponentDisconnected') {
        alert(message.message || "Your opponent disconnected. You win!");
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
        setWinScreenData(null);
      } else if (message.type === 'gameAborted') {
        alert(message.message || "Game was cancelled due to disconnection.");
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
        setWinScreenData(null);
      } else if (message.type === 'quadWaiting') {
        console.log('[QUAD] Added to waiting queue:', message);
        setScreen("quadWaiting");
        setQuadWaitingInfo({
          queuePosition: message.queuePosition,
          totalWaiting: message.totalWaiting
        });
      } else if (message.type === 'quadGameJoined') {
        console.log('[QUAD] Game joined:', message);
        setScreen("game");
        setPlayerInfo({
          role: message.playerRole,
          team: message.team,
          roomId: message.roomId,
          gameType: 'quad',
          teammates: message.teammates,
          opponents: message.opponents,
          user: message.user
        });
        setQuadGameState(message.gameState);
      } else if (message.type === 'quadGameResult') {
        console.log('[QUAD] Game result:', message);
        setQuadWinScreenData(message as unknown as QuadWinScreenData);
        setScreen("end");
      } else if (message.type === 'quadGameAborted') {
        console.log('[QUAD] Game aborted:', message.message);
        alert(message.message || 'Quad match was cancelled');
        setScreen("start");
        setPlayerInfo(null);
        setQuadGameState(null);
        setQuadWaitingInfo(null);
      } else if (message.type === 'gameResult') {
        console.log('[MATCHMAKING] Game result received:', message);
        
        // Transform backend data structure to frontend expected structure
        const playerData = {
          ...message.data,
          won: message.data.result === 'victory',
          stats: message.data.progression ? {
            oldRating: message.data.progression.before.rankPoints,
            newRating: message.data.progression.after.rankPoints,
            oldXp: message.data.progression.before.experience,
            newXp: message.data.progression.after.experience,
            oldLevel: message.data.progression.before.level,
            newLevel: message.data.progression.after.level,
            totalMatches: message.data.progression.after.gamesPlayed,
            wins: message.data.progression.after.gamesWon,
            losses: message.data.progression.after.gamesLost
          } : undefined
        };
        
        console.log('[MATCHMAKING] Transformed playerData:', playerData);
        
        setWinScreenData({
          playerData: playerData,
          matchData: message.matchData
        });
        setScreen("end");
      } else if (message.type) {
        // Unknown message type - check if it's a game state update
        if (message.ball && message.player1 && message.player2) {
          const state = message as GameState;
          setGameState(state);
          
          if (state.winner) {
            setScreen("end");
          }
        } else if (message.ball && message.team1Player1 && message.team2Player1) {
          // Quad game state update
          const quadState = message as unknown as QuadGameState;
          setQuadGameState(quadState);
          
          // Don't set screen to "end" here - wait for quadGameResult message with stats
        }
      } else {
        // Regular game state update
        if (message.ball && message.player1 && message.player2) {
          const state = message as unknown as GameState;
          setGameState(state);
          
          if (state.winner) {
            setScreen("end");
          }
        } else if (message.ball && message.team1Player1 && message.team2Player1) {
          // Quad game state update
          const quadState = message as unknown as QuadGameState;
          setQuadGameState(quadState);
          
          // Don't set screen to "end" here - wait for quadGameResult message with stats
        }
      }
    };
  }, [disconnect, setGameState, setScreen, setPlayerInfo, setAuthError, setIsAuthenticated, setWinScreenData, setTournamentQueue, setTournamentBracket, setMatchReadyInfo, tournamentWaitingTimeoutRef, matchReadyCountdownRef, setQuadGameState, setQuadWaitingInfo, setQuadWinScreenData]);

  return {
    wsRef,
    isConnected,
    connect,
    disconnect,
    sendMessage
  };
};

