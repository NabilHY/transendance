'use client';

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useAuthGuard';

// Helper function to get the correct host (works with localhost, 127.0.0.1, or any IP)
const getApiHost = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

// API URL builders
const getAuthBackendUrl = () => `http://${getApiHost()}:8005`;
const getGameBackendUrl = () => `http://${getApiHost()}:4322`;

export default function GamePage() {
  const { user } = useAuth();
  const { loading: authLoading, isAuthenticated: isLoggedIn } = useRequireAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tournamentWaitingTimeoutRef = useRef<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [screen, setScreen] = useState<"start" | "waiting" | "game" | "end" | "tournamentWaiting" | "tournamentMatchReady">("start");
  const [isConnected, setIsConnected] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [gameMode, setGameMode] = useState<"solo" | "matchmaking" | "ai" | "tournament">("matchmaking");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard" | "impossible">("medium");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [winScreenData, setWinScreenData] = useState<any>(null);
  const [tournamentQueue, setTournamentQueue] = useState<any>(null);
  const [tournamentBracket, setTournamentBracket] = useState<any>(null);
  const [matchReadyInfo, setMatchReadyInfo] = useState<any>(null);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div style={{ 
        padding: "20px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "white"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            border: "3px solid #ffc107", 
            borderTop: "3px solid transparent", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Get authentication token by calling auth backend
  const getAuthToken = async () => {
    console.log('🔍 Checking authentication with auth backend...');
    
    try {
      // Call the game-token endpoint to get access token
      const response = await fetch(`${getAuthBackendUrl()}/api/game-token`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got token from auth backend:', data.user);
        
        // Store user info for display
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

  // Fetch player statistics from the game backend with automatic token refresh
  const fetchPlayerStats = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No token available for stats fetch');
        return;
      }

      const makeRequest = async (authToken: string) => {
        return await fetch(`${getGameBackendUrl()}/api/player-stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
      };

      let response = await makeRequest(token);

      // If we get 401, try to refresh token and retry
      if (response.status === 401) {
        console.log('🔄 Token expired, attempting to refresh...');
        try {
          const refreshResponse = await fetch(`${getAuthBackendUrl()}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            console.log('✅ Token refreshed successfully, retrying stats request...');
            const newToken = await getAuthToken();
            if (newToken) {
              response = await makeRequest(newToken);
            } else {
              console.log('❌ Could not get new token after refresh');
              return;
            }
          } else {
            console.log('❌ Token refresh failed');
            return;
          }
        } catch (refreshError) {
          console.log('💥 Error during token refresh:', refreshError);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got player stats:', data);
        setPlayerStats(data.stats);
      } else {
        console.log('❌ Failed to fetch player stats:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching player stats:', error);
    }
  };

  // Calculate rank info based on rank points (Valorant-style ranking)
  const getRankInfo = (rankPoints: number) => {
    const ranks = [
      { tier: "Bronze", level: 1, minPoints: 0, maxPoints: 19, color: "#CD7F32" },
      { tier: "Bronze", level: 2, minPoints: 20, maxPoints: 39, color: "#CD7F32" },
      { tier: "Bronze", level: 3, minPoints: 40, maxPoints: 59, color: "#CD7F32" },
      { tier: "Silver", level: 1, minPoints: 60, maxPoints: 79, color: "#C0C0C0" },
      { tier: "Silver", level: 2, minPoints: 80, maxPoints: 99, color: "#C0C0C0" },
      { tier: "Silver", level: 3, minPoints: 100, maxPoints: 119, color: "#C0C0C0" },
      { tier: "Gold", level: 1, minPoints: 120, maxPoints: 139, color: "#FFD700" },
      { tier: "Gold", level: 2, minPoints: 140, maxPoints: 159, color: "#FFD700" },
      { tier: "Gold", level: 3, minPoints: 160, maxPoints: 179, color: "#FFD700" },
      { tier: "Platinum", level: 1, minPoints: 180, maxPoints: 199, color: "#E5E4E2" },
      { tier: "Platinum", level: 2, minPoints: 200, maxPoints: 219, color: "#E5E4E2" },
      { tier: "Platinum", level: 3, minPoints: 220, maxPoints: 239, color: "#E5E4E2" },
      { tier: "Diamond", level: 1, minPoints: 240, maxPoints: 259, color: "#B9F2FF" },
      { tier: "Diamond", level: 2, minPoints: 260, maxPoints: 279, color: "#B9F2FF" },
      { tier: "Diamond", level: 3, minPoints: 280, maxPoints: 299, color: "#B9F2FF" },
      { tier: "Immortal", level: 1, minPoints: 300, maxPoints: 319, color: "#FF6B6B" },
      { tier: "Immortal", level: 2, minPoints: 320, maxPoints: 339, color: "#FF6B6B" },
      { tier: "Immortal", level: 3, minPoints: 340, maxPoints: 359, color: "#FF6B6B" },
      { tier: "Radiant", level: 1, minPoints: 360, maxPoints: 999, color: "#FFFF00" }
    ];

    const points = Math.max(0, Math.min(999, rankPoints || 0));
    
    for (const rank of ranks) {
      if (points >= rank.minPoints && points <= rank.maxPoints) {
        return {
          ...rank,
          points: points,
          progressToNext: points - rank.minPoints,
          pointsNeededForNext: rank.maxPoints - points
        };
      }
    }
    
    return ranks[0]; // Fallback to Bronze 1
  };

  // Check if we have a valid token on component mount
  useEffect(() => {
    if (!isLoggedIn || authLoading) return;
    
    const checkAuth = async () => {
      const token = await getAuthToken();
      if (token) {
        console.log('🎉 Valid token detected on page load, clearing auth error');
        setAuthError(null);
        setIsAuthenticated(true);
        // Fetch player stats when authenticated
        fetchPlayerStats();
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [isLoggedIn]);

  // Handle page refresh/close - disconnect from websocket and clean up
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only send disconnect if we're actually leaving the page
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('🔌 Page unloading - closing WebSocket');
        wsRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Separate render function
  const renderGame = (state: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Center line
    ctx.strokeStyle = "gray";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles + ball
    ctx.fillStyle = "white";
    ctx.fillRect(state.player1.x, state.player1.y, 10, 100);
    ctx.fillRect(state.player2.x, state.player2.y, 10, 100);
    ctx.fillRect(state.ball.x, state.ball.y, 10, 10);

    // Player role indicators
    if (playerInfo?.role) {
      ctx.fillStyle = "yellow";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      
      if (playerInfo.role === 'player1' || playerInfo.role === 'both') {
        ctx.fillText("YOU", 25, 25);
      }
      if (playerInfo.role === 'player2' || playerInfo.role === 'both') {
        ctx.textAlign = "right";
        ctx.fillText(playerInfo.role === 'both' ? "YOU" : "YOU", canvas.width - 25, 25);
      }
    }

    // Countdown
    if (state.countdown > 0) {
      ctx.fillStyle = "yellow";
      ctx.font = "30px Arial";
      ctx.textAlign = "center";
      ctx.fillText(state.countdown.toString(), canvas.width / 2, canvas.height / 2);
    }
  };

  // Handle restart
  const handleRestart = () => {
    console.log("Restarting game...");
    
    if (playerInfo?.gameType === 'solo') {
      // Solo mode: just reset the game
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "reset" }));
      }
      setGameState(null);
      setScreen("game");
    } else {
      // Multiplayer mode: leave game and return to start
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "reset" }));
      }
      // The server will send a 'gameLeft' message which will handle the screen change
    }
  };

  // Handle start game modes
  const handleStartSolo = async () => {
    console.log("🎮 Starting solo game...");
    await connectWebSocketWithMode('solo');
  };

  const handleStartMultiplayer = async () => {
    console.log("🎮 Starting multiplayer matchmaking...");
    await connectWebSocketWithMode('matchmaking');
  };

  const handleStartAI = async () => {
    console.log("🎮 Starting AI game...");
    await connectWebSocketWithMode('ai', aiDifficulty);
  };

  // Cancel matchmaking function
  const cancelMatchmaking = () => {
    console.log("🚫 Cancelling matchmaking...");
    
    // Send cancel message to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cancel'
      }));
      console.log("📤 Sent cancel message to backend");
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Reset to start screen
    setScreen("start");
    console.log("✅ Matchmaking cancelled locally");
  };

  const connectWebSocketWithMode = async (gameMode: string, aiDifficultyParam?: string) => {
    console.log(`🔗 Attempting to connect with game mode: ${gameMode}`);
    
    // Close existing connection if any
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        console.log("🔌 Closing existing WebSocket connection");
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);
    }

    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      console.log("❌ No auth token found");
      setAuthError('Please log in first.');
      return;
    }

    // Clear any previous auth errors
    setAuthError(null);
    console.log("✅ Token found, proceeding with connection");

    // Dynamic WebSocket URL with fallback
    let wsUrl = `ws://${window.location.hostname}:4322/ws`;
    
    // Add token as query parameter
    wsUrl += `?token=${encodeURIComponent(token)}`;
    
    console.log(`🔗 Connecting to WebSocket: ${wsUrl.replace(/token=[^&]+/, 'token=***')}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket disconnected. Code:", event.code, "Reason:", event.reason, "Was clean:", event.wasClean);
      setIsConnected(false);
      // Only set auth error if it's an authentication-related closure
      if (event.code === 1008 || event.code === 4001) {
        setAuthError('Authentication failed. Please check your token.');
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setAuthError('Connection error. Please try again.');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

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
        
        // Now send the join message after authentication
        const joinMessage: any = { type: "join", gameMode };
        if (gameMode === 'ai' && aiDifficultyParam) {
          joinMessage.aiDifficulty = aiDifficultyParam;
        }
        console.log("📤 Sending join message after auth:", joinMessage);
        ws.send(JSON.stringify(joinMessage));
      } else if (message.type === 'waiting' || message.type === 'waitingForOpponent') {
        console.log("⏳ Waiting for opponent...", message);
        setScreen("waiting");
        
        const waitingData = {
          ...message,
          user: playerInfo?.user || message.user
        };
        
        setPlayerInfo(waitingData);
      } else if (message.type === 'gameJoined') {
        console.log("🎮 Game joined! Message:", message);
        setScreen("game");
        
        const playerData = {
          role: message.playerRole,
          roomId: message.roomId,
          gameType: message.gameMode || 'multiplayer',
          opponent: message.opponent,
          user: playerInfo?.user
        };
        
        setPlayerInfo(playerData);
        setGameState(message.gameState);
      } else if (message.type === 'tournamentQueued') {
        console.log("🏆 Joined tournament queue:", message);
        setScreen("tournamentWaiting");
        setTournamentQueue({
          queuePosition: message.queuePosition,
          queueSize: message.queueSize,
          playerList: message.playerList
        });
      } else if (message.type === 'tournamentStarted') {
        console.log("🎯 Tournament started:", message);
        setTournamentBracket(message.bracket);
        setScreen("tournamentWaiting");
      } else if (message.type === 'tournamentMatchReady') {
        console.log("🎮 Tournament match ready:", message);
        
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
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'tournamentMatchReady',
            matchData: message.matchData
          }));
        }
        
        setTimeout(() => {
          console.log("🚨🚨🚨 STARTING GAME NOW 🚨🚨🚨");
          setScreen("game");
          
          const playerData = {
            role: message.playerRole,
            roomId: message.roomId,
            gameType: 'tournament',
            opponent: message.opponent,
            user: playerInfo?.user,
            tournamentId: message.tournamentId,
            round: message.round
          };
          
          setPlayerInfo(playerData);
          setGameState(message.gameState);
        }, 3000);
      } else if (message.type === 'tournamentMatchResult') {
        console.log("🏆 Tournament match result:", message);
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
        console.log("👑 Tournament champion:", message);
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
        console.log("✅ Match cancellation confirmed:", message.message);
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
      } else if (message.type === 'opponentDisconnected') {
        console.log("🏆 Opponent disconnected - you win!");
        alert(message.message || "Your opponent disconnected. You win!");
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
        setWinScreenData(null);
      } else if (message.type === 'gameAborted') {
        console.log("🚫 Game was aborted:", message.message);
        alert(message.message || "Game was cancelled due to disconnection.");
        setScreen("start");
        setPlayerInfo(null);
        setGameState(null);
        setWinScreenData(null);
      } else if (message.type === 'gameResult') {
        console.log("🎉 Game result received:", message);
        
        if (playerInfo?.gameType === 'tournament') {
          console.log("⏭️ Skipping normal win screen for tournament game");
          return;
        }
        
        setWinScreenData({
          playerData: message.data,
          matchData: message.matchData
        });
        setScreen("end");
      } else if (message.type) {
        console.log("🤔 Unknown message type:", message.type, message);
        
        if (message.ball && message.player1 && message.player2) {
          const state = message;
          setGameState(state);
          renderGame(state);
          
          if (state.winner && screen !== "end" && playerInfo?.gameType !== 'tournament') {
            setScreen("end");
          }
        }
      } else {
        // Regular game state update
        const state = message;
        setGameState(state);
        renderGame(state);

        if (state.winner && screen !== "end" && playerInfo?.gameType !== 'tournament') {
          setScreen("end");
        }
      }
    };
  };

  // Log screen changes for debugging
  useEffect(() => {
    console.log(`🚨🚨 SCREEN: ${screen} 🚨🚨🚨`);
  }, [screen]);

  // Set up keyboard controls
  useEffect(() => {
    if (screen !== "game") return;
    
    console.log("Setting up controls for player:", playerInfo?.role);

    const keysPressed = new Set<string>();
    
    const sendUpdate = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      
      let player1DY = 0;
      let player2DY = 0;
      
      let myMovement = 0;
      if (keysPressed.has("w") || keysPressed.has("W") || keysPressed.has("ArrowUp")) {
        myMovement -= 5;
      }
      if (keysPressed.has("s") || keysPressed.has("S") || keysPressed.has("ArrowDown")) {
        myMovement += 5;
      }
      
      if (playerInfo?.role === 'player1') {
        player1DY = myMovement;
      } else if (playerInfo?.role === 'player2') {
        player2DY = myMovement;
      } else if (playerInfo?.role === 'both') {
        if (keysPressed.has("w") || keysPressed.has("W")) player1DY -= 5;
        if (keysPressed.has("s") || keysPressed.has("S")) player1DY += 5;
        if (keysPressed.has("ArrowUp")) player2DY -= 5;
        if (keysPressed.has("ArrowDown")) player2DY += 5;
      }
      
      if ((player1DY !== 0 || player2DY !== 0)) {
        console.log(`🎮 Frontend sending: role=${playerInfo?.role}, p1DY=${player1DY}, p2DY=${player2DY}, keys=[${Array.from(keysPressed)}]`);
      }
      
      wsRef.current.send(JSON.stringify({ type: "update", player1DY, player2DY }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.add(e.key);
      sendUpdate();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      keysPressed.delete(e.key);
      sendUpdate();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [screen, playerInfo]);

  // Render game state updates
  useEffect(() => {
    if (gameState && screen === "game") {
      renderGame(gameState);
    }
  }, [gameState, screen]);

  // Win Screen Component
  const renderWinScreen = () => {
    if (winScreenData?.isTournament) {
      const { playerData, matchData } = winScreenData;
      const isWinner = playerData.won;
      const isChampion = matchData.isTournamentWinner;
      const waitingForNext = matchData.waitingForNextRound;
      const stats = playerData.stats;
      
      const winRate = stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : '0.0';
      
      return (
        <div style={{
          padding: "30px",
          backgroundColor: "#1a1a1a",
          borderRadius: "15px",
          border: `3px solid ${isWinner ? "#28a745" : "#dc3545"}`,
          maxWidth: "700px",
          margin: "0 auto",
          textAlign: "center"
        }}>
          <h1 style={{
            fontSize: "48px",
            color: isWinner ? "#ffd700" : "#dc3545",
            textShadow: isWinner ? "0 0 20px #ffd700" : "0 0 20px #dc3545",
            marginBottom: "10px",
            fontWeight: "bold"
          }}>
            {isChampion ? "👑 TOURNAMENT CHAMPION! 👑" : 
             isWinner ? "🎉 VICTORY! 🎉" : 
             "💔 ELIMINATED 💔"}
          </h1>
          
          <p style={{ fontSize: "18px", color: "#ccc", marginBottom: "20px" }}>
            <strong>vs</strong> {playerData.opponent}
          </p>
          
          <div style={{
            backgroundColor: "#2a2a2a",
            padding: "25px",
            borderRadius: "10px",
            marginBottom: "20px"
          }}>
            <h3 style={{ color: "#ffc107", marginTop: 0, marginBottom: "20px" }}>
              📊 Stats Update
            </h3>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px",
              backgroundColor: "#1a1a1a",
              borderRadius: "8px",
              marginBottom: "15px"
            }}>
              <span style={{ fontSize: "16px", color: "#aaa" }}>Ranked Rating</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px", color: "#fff" }}>{stats.oldRating}</span>
                <span style={{ 
                  fontSize: "20px", 
                  color: playerData.ratingChange >= 0 ? "#28a745" : "#dc3545",
                  fontWeight: "bold"
                }}>
                  →
                </span>
                <span style={{ 
                  fontSize: "20px", 
                  color: playerData.ratingChange >= 0 ? "#28a745" : "#dc3545",
                  fontWeight: "bold"
                }}>
                  {stats.newRating} ({playerData.ratingChange >= 0 ? '+' : ''}{playerData.ratingChange})
                </span>
              </div>
            </div>
            
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px",
              backgroundColor: "#1a1a1a",
              borderRadius: "8px",
              marginBottom: "15px"
            }}>
              <span style={{ fontSize: "16px", color: "#aaa" }}>Experience</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px", color: "#fff" }}>{stats.oldXp}</span>
                <span style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>→</span>
                <span style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>
                  {stats.newXp} (+{playerData.xpGain})
                </span>
              </div>
            </div>
            
            {stats.newLevel > stats.oldLevel && (
              <div style={{
                padding: "12px",
                backgroundColor: "#ffc107",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "2px solid #ff9800"
              }}>
                <span style={{ fontSize: "18px", color: "#000", fontWeight: "bold" }}>
                  🎊 LEVEL UP! Level {stats.oldLevel} → {stats.newLevel} 🎊
                </span>
              </div>
            )}
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "10px",
              marginTop: "15px"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#aaa" }}>Matches</div>
                <div style={{ fontSize: "20px", color: "#fff", fontWeight: "bold" }}>{stats.totalMatches}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#aaa" }}>Wins</div>
                <div style={{ fontSize: "20px", color: "#28a745", fontWeight: "bold" }}>{stats.wins}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "14px", color: "#aaa" }}>Win Rate</div>
                <div style={{ fontSize: "20px", color: "#17a2b8", fontWeight: "bold" }}>{winRate}%</div>
              </div>
            </div>
          </div>
          
          {isChampion && (
            <div style={{
              backgroundColor: "#2a2a2a",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
              border: "3px solid #ffd700",
              boxShadow: "0 0 20px #ffd700"
            }}>
              <p style={{ fontSize: "24px", color: "#ffd700", fontWeight: "bold", margin: 0 }}>
                🏆 You are the Tournament Champion! 🏆
              </p>
            </div>
          )}
          
          {isWinner && waitingForNext && !isChampion && (
            <div style={{
              backgroundColor: "#2a2a2a",
              padding: "18px",
              borderRadius: "10px",
              marginBottom: "20px",
              border: "2px solid #28a745"
            }}>
              <p style={{ fontSize: "18px", color: "#28a745", fontWeight: "bold", margin: 0 }}>
                ✅ You've Advanced to the Next Round!
              </p>
            </div>
          )}
          
          <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "20px" }}>
            {isWinner && waitingForNext ? (
              <button
                onClick={() => {
                  setWinScreenData(null);
                  setScreen("tournamentWaiting");
                }}
                style={{
                  padding: "15px 30px",
                  fontSize: "18px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ➡️ Continue
              </button>
            ) : (
              <button
                onClick={() => {
                  setScreen("start");
                  setPlayerInfo(null);
                  setGameState(null);
                  setWinScreenData(null);
                  setTournamentQueue(null);
                  setTournamentBracket(null);
                  if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                  }
                }}
                style={{
                  padding: "15px 30px",
                  fontSize: "18px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                🏠 Return to Main Menu
              </button>
            )}
          </div>
        </div>
      );
    }
    
    if (!winScreenData) {
      return (
        <div style={{
          padding: "30px",
          backgroundColor: "#1a1a1a",
          borderRadius: "15px",
          border: "2px solid #333",
          maxWidth: "600px",
          margin: "0 auto",
          textAlign: "center"
        }}>
          <h1 style={{
            fontSize: "48px",
            color: gameState?.winner === 'Player 1' ? "#28a745" : "#dc3545",
            marginBottom: "20px",
            fontWeight: "bold"
          }}>
            🎉 {gameState?.winner} Wins! 🎉
          </h1>
          
          <p style={{ fontSize: "24px", marginBottom: "30px" }}>
            Final Score: {gameState?.player1?.score || 0} - {gameState?.player2?.score || 0}
          </p>
          
          <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
            <button
              onClick={handleRestart}
              style={{
                padding: "12px 25px",
                fontSize: "16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🎮 Play Again
            </button>
            <button
              onClick={() => {
                setScreen("start");
                setPlayerInfo(null);
                setGameState(null);
                setWinScreenData(null);
                if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
                }
              }}
              style={{
                padding: "12px 25px",
                fontSize: "16px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🏠 Main Menu
            </button>
          </div>
        </div>
      );
    }

    const { playerData, matchData } = winScreenData;
    
    return (
      <div style={{
        padding: "30px",
        backgroundColor: "#1a1a1a",
        borderRadius: "15px",
        border: "2px solid #333",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        <h1 style={{
          fontSize: "48px",
          color: playerData.result === 'victory' ? "#28a745" : "#dc3545",
          marginBottom: "20px",
          fontWeight: "bold"
        }}>
          🎉 {playerData.result?.toUpperCase() || 'GAME OVER'} 🎉
        </h1>

        <div style={{ 
          backgroundColor: "#2a2a2a", 
          padding: "20px", 
          borderRadius: "10px", 
          marginBottom: "25px" 
        }}>
          <h3 style={{ color: "#ffd700", marginBottom: "15px" }}>Match Summary</h3>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span><strong>Duration:</strong> {matchData.duration}</span>
            <span><strong>Winner:</strong> {matchData.winnerName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span><strong>Final Score:</strong> {matchData.player1Score} - {matchData.player2Score}</span>
            <span><strong>Total Volleys:</strong> {matchData.totalVolleys}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
          <button
            onClick={handleRestart}
            style={{
              padding: "12px 25px",
              fontSize: "16px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            🎮 Play Again
          </button>
          <button
            onClick={() => {
              setScreen("start");
              setPlayerInfo(null);
              setGameState(null);
              setWinScreenData(null);
              if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
              }
            }}
            style={{
              padding: "12px 25px",
              fontSize: "16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            🏠 Main Menu
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
      <div style={{ 
        padding: "20px",
        height: "100%",
        overflow: "auto",
        backgroundColor: "#0a0a0a",
        color: "white"
      }}>
      {screen === "start" && (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "20px", textAlign: "center" }}>Pong Game</h1>
          
          {/* Player Statistics Card */}
          {isAuthenticated && playerStats && (
            <div style={{ 
              marginBottom: "25px",
              padding: "20px",
              backgroundColor: "#1a1a1a",
              borderRadius: "12px",
              border: "2px solid #333",
              maxWidth: "600px",
              margin: "0 auto 25px auto"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "15px"
              }}>
                <h3 style={{ margin: 0, color: "#ffc107" }}>Player Statistics</h3>
                {playerInfo?.username && (
                  <div style={{ 
                    fontSize: "16px", 
                    color: "#4CAF50",
                    fontWeight: "bold",
                    padding: "5px 12px",
                    backgroundColor: "#2a2a2a",
                    borderRadius: "6px",
                    border: "1px solid #4CAF50"
                  }}>
                    @{playerInfo.username}
                  </div>
                )}
              </div>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
                gap: "15px",
                textAlign: "center"
              }}>
                {(() => {
                  const rankInfo = getRankInfo(playerStats.rank_points);
                  return (
                    <div style={{ 
                      padding: "12px",
                      backgroundColor: "#2a2a2a",
                      borderRadius: "8px",
                      border: `2px solid ${rankInfo.color}`,
                    }}>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>Rank</div>
                      <div style={{ 
                        fontSize: "16px", 
                        fontWeight: "bold", 
                        color: rankInfo.color 
                      }}>
                        {rankInfo.tier} {rankInfo.level}
                      </div>
                      <div style={{ fontSize: "11px", color: "#999" }}>
                        {playerStats.rank_points} RP
                      </div>
                    </div>
                  );
                })()}
                
                <div style={{ 
                  padding: "12px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: "1px solid #444"
                }}>
                  <div style={{ fontSize: "12px", color: "#ccc" }}>Level</div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00bfff" }}>
                    {playerStats.player_level}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {playerStats.experience_points} XP
                  </div>
                </div>

                <div style={{ 
                  padding: "12px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: "1px solid #444"
                }}>
                  <div style={{ fontSize: "12px", color: "#ccc" }}>Record</div>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                    <span style={{ color: "#28a745" }}>{playerStats.games_won}W</span>
                    <span style={{ color: "#666" }}> - </span>
                    <span style={{ color: "#dc3545" }}>{playerStats.games_lost || 0}L</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {playerStats.win_rate?.toFixed(1) || 0}% WR
                  </div>
                </div>

                <div style={{ 
                  padding: "12px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: "1px solid #444"
                }}>
                  <div style={{ fontSize: "12px", color: "#ccc" }}>Streak</div>
                  <div style={{ 
                    fontSize: "16px", 
                    fontWeight: "bold",
                    color: playerStats.current_streak > 0 ? "#ffc107" : "#666"
                  }}>
                    {playerStats.current_streak || 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    {playerStats.current_streak > 0 ? 'Win' : playerStats.current_streak < 0 ? 'Loss' : 'None'}
                  </div>
                </div>

                <div style={{ 
                  padding: "12px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: "1px solid #444"
                }}>
                  <div style={{ fontSize: "12px", color: "#ccc" }}>Played</div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>
                    {playerStats.games_played || 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "#999" }}>
                    Total Games
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <button
                  onClick={fetchPlayerStats}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Refresh Stats
                </button>
              </div>
            </div>
          )}
          
          {/* Authentication Error */}
          {authError && !isAuthenticated && (
            <div style={{ 
              backgroundColor: "#dc3545", 
              color: "white", 
              padding: "15px", 
              margin: "20px 0", 
              borderRadius: "5px",
              maxWidth: "500px",
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              <h3>Authentication Required</h3>
              <p>{authError}</p>
            </div>
          )}
          
          {/* Game Mode Selection */}
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <h3>Select Game Mode:</h3>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setGameMode("matchmaking")}
                  style={{
                    padding: "10px 15px",
                    fontSize: "14px",
                    backgroundColor: gameMode === "matchmaking" ? "#28a745" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    display: "block",
                    marginBottom: "5px"
                  }}
                >
                  🎮 Find Opponent
                </button>
                <small style={{ color: "#ccc", fontSize: "12px" }}>
                  Play online vs another player
                </small>
              </div>
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setGameMode("ai")}
                  style={{
                    padding: "10px 15px",
                    fontSize: "14px",
                    backgroundColor: gameMode === "ai" ? "#28a745" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    display: "block",
                    marginBottom: "5px"
                  }}
                >
                  🤖 vs AI
                </button>
                <small style={{ color: "#ccc", fontSize: "12px" }}>
                  Play against computer
                </small>
              </div>
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setGameMode("solo")}
                  style={{
                    padding: "10px 15px",
                    fontSize: "14px",
                    backgroundColor: gameMode === "solo" ? "#28a745" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    display: "block",
                    marginBottom: "5px"
                  }}
                >
                  👥 Coop Mode
                </button>
                <small style={{ color: "#ccc", fontSize: "12px" }}>
                  Local 2-player game
                </small>
              </div>
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={() => setGameMode("tournament")}
                  style={{
                    padding: "10px 15px",
                    fontSize: "14px",
                    backgroundColor: gameMode === "tournament" ? "#28a745" : "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    display: "block",
                    marginBottom: "5px"
                  }}
                >
                  🏆 Tournament
                </button>
                <small style={{ color: "#ccc", fontSize: "12px" }}>
                  8-player bracket
                </small>
              </div>
            </div>
          </div>

          {/* AI Difficulty Selection */}
          {gameMode === "ai" && (
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <h4>AI Difficulty:</h4>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                {["easy", "medium", "hard", "impossible"].map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setAiDifficulty(difficulty as any)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      backgroundColor: aiDifficulty === difficulty ? "#007bff" : "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {difficulty === "impossible" ? "🔥 Impossible" : 
                     difficulty === "hard" ? "💪 Hard" :
                     difficulty === "medium" ? "⚖️ Medium" : "😊 Easy"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ textAlign: "center" }}>
            <button 
              onClick={() => {
                if (gameMode === "matchmaking") handleStartMultiplayer();
                else if (gameMode === "ai") handleStartAI();
                else if (gameMode === "tournament") connectWebSocketWithMode('tournament');
                else handleStartSolo();
              }}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer"
              }}
            >
              {gameMode === "matchmaking" ? "🎮 Find Opponent" : 
               gameMode === "ai" ? `🤖 Fight ${aiDifficulty.toUpperCase()} AI` : 
               gameMode === "tournament" ? "🏆 Join Tournament" :
               "👥 Start Coop"}
            </button>
          </div>
        </div>
      )}

      {screen === "waiting" && (
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
              animation: "spin 1s linear infinite",
              margin: "10px auto"
            }}></div>
          </div>
          <button
            onClick={cancelMatchmaking}
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
      )}

      {screen === "tournamentWaiting" && (
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
            onClick={cancelMatchmaking}
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
      )}

      {screen === "tournamentMatchReady" && matchReadyInfo && (
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
      )}

      {screen === "game" && (
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: "bold" }}>Player 1: {gameState?.player1?.score || 0}</div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>
                  {playerInfo?.role === 'player1' 
                    ? `👤 ${playerInfo?.user?.username || 'You'}` 
                    : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
                </div>
              </div>
              <span style={{ 
                padding: "2px 8px", 
                backgroundColor: playerInfo?.gameType === 'solo' ? "#ffc107" : "#17a2b8",
                borderRadius: "12px", 
                fontSize: "12px" 
              }}>
                {playerInfo?.gameType === 'solo' ? "Practice Mode" : `Multiplayer - You are ${playerInfo?.role}`}
              </span>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontWeight: "bold" }}>Player 2: {gameState?.player2?.score || 0}</div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>
                  {playerInfo?.role === 'player2' 
                    ? `👤 ${playerInfo?.user?.username || 'You'}` 
                    : `👤 ${playerInfo?.opponent?.username || 'Opponent'}`}
                </div>
              </div>
            </div>
            
            <p>Connection: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
            
            <p style={{ fontSize: "12px" }}>
              {playerInfo?.role === 'player1' && "Your paddle (Left): W/S or ↑/↓"}
              {playerInfo?.role === 'player2' && "Your paddle (Right): W/S or ↑/↓"}
              {playerInfo?.role === 'both' && "Left paddle: W/S | Right paddle: ↑/↓"}
            </p>
          </div>
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={400} 
            style={{ border: "2px solid white", display: "block", margin: "0 auto" }} 
          />
        </div>
      )}

      {screen === "end" && renderWinScreen()}
      </div>
    </>
  );
}
