'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useSearchParams } from 'next/navigation';
import { getAuthToken, fetchPlayerStats, getAuthBackendUrl } from './utils/api';
import { useGameWebSocket } from './hooks/useGameWebSocket';
import { useGameKeyboard } from './hooks/useGameKeyboard';
import { GameStartScreen } from './components/GameStartScreen';
import { GameWaitingScreen } from './components/GameWaitingScreen';
import { GameScreen } from './components/GameScreen';
import { GameWinScreen } from './components/GameWinScreen';
import { GameTournamentWaitingScreen } from './components/GameTournamentWaitingScreen';
import { GameTournamentMatchReadyScreen } from './components/GameTournamentMatchReadyScreen';
import { GameQuadWaitingScreen } from './components/GameQuadWaitingScreen';
import { GameLoadingScreen } from './components/GameLoadingScreen';
import { MatchHistoryPanel } from './components/MatchHistoryPanel';
import styles from './styles.module.css';
import type { GameScreen as GameScreenType, GameMode, AIDifficulty, GameState, QuadGameState, PlayerInfo, PlayerStats, WinScreenData, TournamentQueue, MatchReadyInfo, QuadWaitingInfo, QuadWinScreenData } from './types';

export default function GamePage() {
  const { user } = useAuth();
  const { loading: authLoading, isAuthenticated: isLoggedIn } = useRequireAuth();
  const searchParams = useSearchParams();
  const tournamentWaitingTimeoutRef = useRef<any>(null);
  const matchReadyCountdownRef = useRef<any>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [quadGameState, setQuadGameState] = useState<QuadGameState | null>(null);
  const [screen, setScreen] = useState<GameScreenType>("start");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("matchmaking");
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>("medium");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [winScreenData, setWinScreenData] = useState<WinScreenData | null>(null);
  const [tournamentQueue, setTournamentQueue] = useState<TournamentQueue | null>(null);
  const [tournamentBracket, setTournamentBracket] = useState<any>(null);
  const [matchReadyInfo, setMatchReadyInfo] = useState<MatchReadyInfo | null>(null);
  const [quadWaitingInfo, setQuadWaitingInfo] = useState<QuadWaitingInfo | null>(null);
  const [quadWinScreenData, setQuadWinScreenData] = useState<QuadWinScreenData | null>(null);
  const [matchHistoryRefresh, setMatchHistoryRefresh] = useState<number>(0);
  const [directGameInfo, setDirectGameInfo] = useState<{ opponentId: string; inviteId: string } | null>(null);

  // WebSocket connection
  const {
    wsRef,
    isConnected,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    sendMessage
  } = useGameWebSocket(
    setGameState,
    setScreen,
    setPlayerInfo,
    setAuthError,
    setIsAuthenticated,
    setWinScreenData,
    setTournamentQueue,
    setTournamentBracket,
    setMatchReadyInfo,
    tournamentWaitingTimeoutRef,
    matchReadyCountdownRef,
    setQuadGameState,
    setQuadWaitingInfo,
    setQuadWinScreenData
  );

  // Keyboard controls
  const sendPlayerUpdate = useCallback((player1DY: number, player2DY: number) => {
    sendMessage({ type: "update", player1DY, player2DY });
  }, [sendMessage]);

  const sendQuadUpdate = useCallback((dy: number) => {
    sendMessage({ type: "quadUpdate", dy });
  }, [sendMessage]);

  useGameKeyboard({
    enabled: screen === "game",
    playerInfo,
    sendUpdate: sendPlayerUpdate,
    sendQuadUpdate: sendQuadUpdate
  });

  // Get authentication token with user info
  const getAuthTokenWithUser = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${getAuthBackendUrl()}/api/game-token`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setPlayerInfo({ user: data.user, username: data.user.username });
          setIsAuthenticated(true);
        }
        return data.token;
      } else {
        const error = await response.json().catch(() => ({}));
        console.log('❌ Failed to get token from auth backend:', response.status, error);
        setAuthError('Please log in to play the game.');
        return null;
      }
    } catch (error) {
      console.log('❌ Error calling auth backend:', error);
      setAuthError('Failed to authenticate. Please try again.');
      return null;
    }
  };

  // Fetch player stats
  const refreshPlayerStats = async () => {
    await fetchPlayerStats(getAuthTokenWithUser, setPlayerStats, setAuthError);
  };

  // Check for direct game invite from URL parameters
  useEffect(() => {
    const mode = searchParams.get('mode');
    const opponentId = searchParams.get('opponentId');
    const inviteId = searchParams.get('inviteId');

    if (mode === 'direct' && opponentId && inviteId) {
      console.log(`🎮 Direct game invite detected: opponentId=${opponentId}, inviteId=${inviteId}`);
      setDirectGameInfo({ opponentId, inviteId });
    }
  }, [searchParams]);

  // Check authentication on mount
  useEffect(() => {
    if (!isLoggedIn || authLoading) return;
    
    const checkAuth = async () => {
      const token = await getAuthTokenWithUser();
      if (token) {
        console.log('🎉 Valid token detected on page load, clearing auth error');
        setAuthError(null);
        setIsAuthenticated(true);
        await refreshPlayerStats();
        
        // Auto-start direct game invite if present
        if (directGameInfo) {
          console.log('🎮 Auto-starting direct game invite...');
          await connectWebSocket('direct', undefined, directGameInfo);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [isLoggedIn, authLoading, directGameInfo]);

  // Handle page refresh/close - disconnect from websocket
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('🔌 Page unloading - closing WebSocket');
        wsRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectWebSocket();
    };
  }, [disconnectWebSocket, wsRef]);

  // Refresh match history when game ends (win screen appears)
  useEffect(() => {
    if (screen === "win" || screen === "quadWin") {
      console.log('📊 Game ended - refreshing match history');
      setMatchHistoryRefresh(prev => prev + 1);
    }
  }, [screen]);

  // Game mode handlers
  const handleStartSolo = async () => {
    console.log("🎮 Starting solo game...");
    await connectWebSocket('solo');
  };

  const handleStartMultiplayer = async () => {
    console.log("🎮 Starting multiplayer matchmaking...");
    await connectWebSocket('matchmaking');
  };

  const handleStartAI = async () => {
    console.log("🎮 Starting AI game...");
    await connectWebSocket('ai', aiDifficulty);
  };

  const handleStartTournament = async () => {
    console.log("🎮 Starting tournament...");
    await connectWebSocket('tournament');
  };

  const handleStartQuad = async () => {
    console.log("🎯 Starting quadra pong matchmaking...");
    await connectWebSocket('quad');
  };

  const handleStartGame = () => {
    if (gameMode === "matchmaking") {
      handleStartMultiplayer();
    } else if (gameMode === "ai") {
      handleStartAI();
    } else if (gameMode === "tournament") {
      handleStartTournament();
    } else if (gameMode === "quad") {
      handleStartQuad();
    } else {
      handleStartSolo();
    }
  };

  // Cancel matchmaking
  const cancelMatchmaking = () => {
    console.log("🚫 Cancelling matchmaking...");
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'cancel' });
    }
    
    disconnectWebSocket();
    setScreen("start");
  };

  // Handle restart
  const handleRestart = () => {
    console.log("Restarting game...");
    
    if (playerInfo?.gameType === 'solo') {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: "reset" });
      }
      setGameState(null);
      setScreen("game");
    } else {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: "reset" });
      }
    }
  };

  // Handle main menu
  const handleMainMenu = () => {
    setScreen("start");
    setPlayerInfo(null);
    setGameState(null);
    setWinScreenData(null);
    setQuadWinScreenData(null);
    setTournamentQueue(null);
    setTournamentBracket(null);
    disconnectWebSocket();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return <GameLoadingScreen />;
  }

  return (
    <div className={styles.page}>
        {screen === "start" && (
          <>
            <GameStartScreen
              isAuthenticated={isAuthenticated}
              playerStats={playerStats}
              playerInfo={playerInfo}
              gameMode={gameMode}
              aiDifficulty={aiDifficulty}
              authError={authError}
              onGameModeChange={setGameMode}
              onAiDifficultyChange={setAiDifficulty}
              onStartGame={handleStartGame}
              onRefreshStats={refreshPlayerStats}
            />
            {user && (
              <MatchHistoryPanel 
                userId={typeof user.id === 'number' ? user.id : parseInt(user.id)} 
                isVisible={true}
                refreshTrigger={matchHistoryRefresh}
                isGamePage={true}
              />
            )}
          </>
        )}

        {screen === "waiting" && (
          <GameWaitingScreen onCancel={cancelMatchmaking} />
        )}

        {screen === "tournamentWaiting" && (
          <GameTournamentWaitingScreen
            tournamentQueue={tournamentQueue}
            tournamentBracket={tournamentBracket}
            onCancel={cancelMatchmaking}
          />
        )}

        {screen === "tournamentMatchReady" && matchReadyInfo && (
          <GameTournamentMatchReadyScreen
            matchReadyInfo={matchReadyInfo}
            playerInfo={playerInfo}
          />
        )}

        {screen === "quadWaiting" && (
          <GameQuadWaitingScreen
            quadWaitingInfo={quadWaitingInfo}
            onCancel={cancelMatchmaking}
          />
        )}

        {screen === "game" && (
          <GameScreen
            gameState={gameState}
            quadGameState={quadGameState}
            playerInfo={playerInfo}
            isConnected={isConnected}
            playerStats={playerStats}
          />
        )}

        {screen === "end" && (
          <GameWinScreen
            winScreenData={winScreenData}
            quadWinScreenData={quadWinScreenData}
            gameState={gameState}
            onRestart={handleRestart}
            onMainMenu={handleMainMenu}
          />
        )}
    </div>
  );
}
