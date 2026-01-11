// Custom hook for WebSocket game connection

import { useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../utils/api';
import type { GameState, QuadGameState, PlayerInfo, GameMode, AIDifficulty, GameScreen as GameScreenType, WebSocketMessage, QuadWaitingInfo, QuadWinScreenData } from '../types';

interface UseGameWebSocketReturn {
  wsRef: React.MutableRefObject<WebSocket | null>;
  isConnected: boolean;
  connect: (gameMode: GameMode, aiDifficulty?: AIDifficulty, directGameInfo?: { opponentId: string; inviteId: string }) => Promise<void>;
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

  const connect = useCallback(async (gameMode: GameMode, aiDifficulty?: AIDifficulty, directGameInfo?: { opponentId: string; inviteId: string }) => {
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

    // Dynamic WebSocket URL:
    // - If NEXT_PUBLIC_WS_URL is set, use it and proxy via nginx at /api/game/ws
    // - Otherwise, if we're on a public origin (80/443/no explicit port), use same-origin /api/game/ws
    // - Otherwise (local dev), connect directly to :4322/ws
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const isPublicOrigin = !window.location.port || window.location.port === '80' || window.location.port === '443';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      ? `${process.env.NEXT_PUBLIC_WS_URL}/api/game/ws?token=${encodeURIComponent(token)}`
      : isPublicOrigin
        ? `${wsScheme}://${window.location.host}/api/game/ws?token=${encodeURIComponent(token)}`
        : `${wsScheme}://${window.location.hostname}:4322/ws?token=${encodeURIComponent(token)}`;
    
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

        if (gameMode === 'direct') {
          if (!directGameInfo?.inviteId || !directGameInfo?.opponentId) {
            setAuthError('Invalid direct match link.');
            setIsConnected(false);
            ws.close();
            return;
          }
          joinMessage.directInvite = {
            inviteId: directGameInfo.inviteId,
            opponentId: parseInt(directGameInfo.opponentId, 10)
          };
        }
        ws.send(JSON.stringify(joinMessage));
      } else if (message.type === 'waiting' || message.type === 'waitingForOpponent') {
        setScreen("waiting");
        setPlayerInfo({ ...message, user: message.user });
      } else if ((message as any).type === 'directMatchError') {
        const err = (message as any).error || 'Failed to start direct match.';
        console.error('❌ Direct match error:', err);
        setAuthError(err);
        setIsConnected(false);
        ws.close();
        return;
      } else if (message.type === 'gameJoined') {
        // Show match ready screen first
        setScreen("matchReady");
        // Preserve existing user data from auth and merge with game data
        setPlayerInfo((prev) => ({
          ...prev,
          role: message.playerRole,
          roomId: message.roomId,
          gameType: message.gameMode || 'multiplayer',
          opponent: message.opponent,
          user: prev?.user || prev // Keep existing user data from authSuccess
        }));
        setGameState(message.gameState);
        
        // Show match ready screen for 4 seconds (3 second countdown + 1 second buffer) before game
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
        }
        matchReadyCountdownRef.current = setTimeout(() => {
          setScreen("game");
          matchReadyCountdownRef.current = null;
        }, 4000);
      } else if (message.type === 'tournamentQueued') {
        setScreen("tournamentWaiting");
        setTournamentQueue({
          queuePosition: message.queuePosition,
          queueSize: message.queueSize,
          playerList: message.playerList
        });
      } else if (message.type === 'tournamentStarted') {
        console.log('[TOURNAMENT] Tournament started with bracket:', message.bracket);
        setTournamentBracket(message.bracket);
        // Show bracket screen first before matches start
        setScreen("tournamentBracket");
        
        // TODO: After showing bracket, wait for server to send first match ready
      } else if (message.type === 'tournamentMatchReady') {
        if (tournamentWaitingTimeoutRef.current) {
          clearTimeout(tournamentWaitingTimeoutRef.current);
          tournamentWaitingTimeoutRef.current = null;
        }
        
        console.log('🎮 Tournament match ready received');
        
        // Store match info
        setMatchReadyInfo({
          opponent: message.opponent,
          playerRole: message.playerRole,
          round: message.round,
          matchId: message.matchId
        });
        
        // Store game data for when we transition
        const gameData = {
          role: message.playerRole,
          roomId: message.roomId,
          gameType: 'tournament',
          opponent: message.opponent,
          user: message.user,
          tournamentId: message.tournamentId,
          round: message.round
        };
        
        ws.send(JSON.stringify({
          type: 'tournamentMatchReady',
          matchData: message.matchData
        }));
        
        // Clear any existing countdown timeout
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
        }
        
        // Small delay before transitioning to game (smooth transition from bracket/waiting)
        matchReadyCountdownRef.current = setTimeout(() => {
          matchReadyCountdownRef.current = null;
          console.log('🚀 Transitioning to game now');
          setScreen("game");
          setPlayerInfo(gameData);
          setGameState(message.gameState);
        }, 1000); // 1 second delay for smooth transition
      } else if (message.type === 'tournamentMatchResult') {
        // Clear any pending match ready countdown if we get a result early
        // (e.g., due to opponent disconnection during countdown)
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
          matchReadyCountdownRef.current = null;
          console.log('⏱️ Cleared match ready countdown due to early match result (opponent disconnected)');
        }
        
        console.log('🏆 Tournament match result received:', {
          won: message.won,
          waitingForNextRound: message.waitingForNextRound,
          isTournamentWinner: message.isTournamentWinner,
          round: message.round
        });
        
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
          console.log('⏳ Winner waiting for next round - setting timeout');
          tournamentWaitingTimeoutRef.current = setTimeout(() => {
            setWinScreenData(null);
            setScreen("tournamentWaiting");
          }, 10000);
        }
      } else if (message.type === 'tournamentBracketUpdate') {
        // Round is complete, show updated bracket to all players
        console.log('📊 Received tournament bracket update, showing bracket');
        setTournamentBracket(message.bracket);
        setScreen("tournamentBracket");
        
        // Clear any win screen data and timeouts
        setWinScreenData(null);
        if (tournamentWaitingTimeoutRef.current) {
          clearTimeout(tournamentWaitingTimeoutRef.current);
          tournamentWaitingTimeoutRef.current = null;
        }
      } else if (message.type === 'tournamentChampion') {
        alert(`🎉 Congratulations! You are the Tournament Champion!`);
      } else if (message.type === 'gameLeft') {
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
      } else if (message.type === 'playerLeft') {
        // For quad games, just show a console message, don't reset the screen
        // The game will continue or end with proper win screens
        console.log('Player left:', message.message);
        // Don't show alert or reset screen - let the game handle it naturally
      } else if (message.type === 'gameEnded') {
        // Game ended due to team disconnection
        console.log('Game ended:', message.reason, message.message);
        if (message.reason === 'opponentTeamLeft') {
          // Show a brief message before resetting
          alert(message.message || 'Opponent team disconnected. You win!');
        }
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
        setQuadGameState(null);
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
        
        // Show match ready screen first for quad games
        setScreen("matchReady");
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
        
        // Transition to game after 4 seconds
        if (matchReadyCountdownRef.current) {
          clearTimeout(matchReadyCountdownRef.current);
        }
        matchReadyCountdownRef.current = setTimeout(() => {
          setScreen("game");
          matchReadyCountdownRef.current = null;
        }, 4000);
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

