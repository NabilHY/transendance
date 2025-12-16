// Custom hook for WebSocket game connection

import { useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../utils/api';
import type { GameState, PlayerInfo, GameMode, AIDifficulty, GameScreen as GameScreenType, WebSocketMessage } from '../types';

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
  tournamentWaitingTimeoutRef: React.MutableRefObject<any>
): UseGameWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
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

    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      setAuthError('Please log in first.');
      return;
    }

    setAuthError(null);

    // Dynamic WebSocket URL - use env override for prod HTTPS, else derive from current protocol
    const baseWs = process.env.NEXT_PUBLIC_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:4322`;
    const wsUrl = `${baseWs}/ws?token=${encodeURIComponent(token)}`;
    
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
        
        setTimeout(() => {
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
      } else if (message.type === 'gameResult') {
        setWinScreenData({
          playerData: message.data,
          matchData: message.matchData
        });
        setScreen("end");
      } else if (message.type) {
        // Unknown message type - check if it's a game state update
        if (message.ball && message.player1 && message.player2) {
          const state = message as unknown as GameState;
          setGameState(state);
          
          if (state.winner) {
            setScreen("end");
          }
        }
      } else {
        // Regular game state update
        const state = message as unknown as GameState;
        setGameState(state);
        
        if (state.winner) {
          setScreen("end");
        }
      }
    };
  }, [disconnect, setGameState, setScreen, setPlayerInfo, setAuthError, setIsAuthenticated, setWinScreenData, setTournamentQueue, setTournamentBracket, setMatchReadyInfo, tournamentWaitingTimeoutRef]);

  return {
    wsRef,
    isConnected,
    connect,
    disconnect,
    sendMessage
  };
};

