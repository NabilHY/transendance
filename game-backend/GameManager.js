const GameState = require('./GameState');
const GameLoop = require('./GameLoop');
const GameStatsHandler = require('./GameStatsHandler');
const WinScreenData = require('./WinScreenData');
const TournamentManager = require('./TournamentManager');
























class GameManager {
  constructor(userAuth) {
    // Store all game rooms
    this.games = new Map(); // roomId -> { gameState, gameLoop, players: Set(), spectators: Set() }
    this.players = new Map(); // connectionId -> { roomId, role, connection }
    this.waitingPlayers = []; // Players waiting to be matched
    // Direct-invite waiting area (inviteId -> { createdAt, player })
    // This is isolated from normal matchmaking to avoid impacting other game modes.
    this.directInviteWaiting = new Map();
    this.nextGameId = 1;
    
    // Track processed games globally to prevent ANY duplicates
    this.processedGames = new Set(); // roomId of games that have been fully processed
    
    // Initialize stats handler
    this.userAuth = userAuth;
    this.statsHandler = new GameStatsHandler(userAuth);
    this.winScreenData = new WinScreenData(this.statsHandler, this.statsHandler.progression);
    
    // Initialize tournament manager
    this.tournamentManager = new TournamentManager();
  }

  // Add an authenticated user to a direct invite match (paired by inviteId).
  // Returns either a waiting-player object (same shape as matchmaking waiting)
  // or a match result (same shape as createMultiplayerGameAuth).
  async addAuthenticatedDirectInvite(connection, user, opponentId, inviteId) {
    // Check if user is already connected
    const existingPlayer = this.findPlayerByUserId(user.id);
    if (existingPlayer) {
      console.log(`User ${user.username} is already connected, disconnecting old connection`);
      await this.removePlayer(existingPlayer.connectionId);
    }

    const connectionId = this.generateConnectionId();
    return this.addToDirectInviteAuth(connection, connectionId, user, opponentId, inviteId);
  }

  addToDirectInviteAuth(connection, connectionId, user, opponentId, inviteId) {
    const normalizedInviteId = typeof inviteId === 'string' ? inviteId.trim() : '';
    const normalizedOpponentId = typeof opponentId === 'string' ? parseInt(opponentId, 10) : opponentId;

    if (!normalizedInviteId) {
      return { error: 'Missing inviteId' };
    }
    if (!Number.isFinite(normalizedOpponentId)) {
      return { error: 'Invalid opponentId' };
    }
    if (user.id === normalizedOpponentId) {
      return { error: 'Invalid direct invite (self invite)' };
    }

    // Expire stale invites (10 minutes)
    const existing = this.directInviteWaiting.get(normalizedInviteId);
    if (existing && Date.now() - existing.createdAt > 10 * 60 * 1000) {
      this.directInviteWaiting.delete(normalizedInviteId);
    }

    const entry = this.directInviteWaiting.get(normalizedInviteId);
    if (!entry) {
      // First player arrives
      this.directInviteWaiting.set(normalizedInviteId, {
        createdAt: Date.now(),
        player: {
          connection,
          connectionId,
          user,
          expectedOpponentId: normalizedOpponentId
        }
      });

      this.players.set(connectionId, {
        roomId: null,
        role: 'waiting',
        connection,
        user
      });

      console.log(`🎟️ Direct invite ${normalizedInviteId}: ${user.username} waiting for opponent ${normalizedOpponentId}`);

      return {
        connectionId,
        roomId: null,
        role: 'waiting',
        user,
        gameType: 'multiplayer',
        gameState: null,
        directInvite: { inviteId: normalizedInviteId, opponentId: normalizedOpponentId }
      };
    }

    // Second player arrives (or someone tries to hijack)
    const first = entry.player;

    // If the same user reconnects, replace the stored connection
    if (first.user && first.user.id === user.id) {
      entry.player = {
        connection,
        connectionId,
        user,
        expectedOpponentId: first.expectedOpponentId
      };
      entry.createdAt = Date.now();
      this.directInviteWaiting.set(normalizedInviteId, entry);

      this.players.set(connectionId, {
        roomId: null,
        role: 'waiting',
        connection,
        user
      });

      console.log(`🎟️ Direct invite ${normalizedInviteId}: ${user.username} reconnected, still waiting`);

      return {
        connectionId,
        roomId: null,
        role: 'waiting',
        user,
        gameType: 'multiplayer',
        gameState: null,
        directInvite: { inviteId: normalizedInviteId, opponentId: first.expectedOpponentId }
      };
    }

    // Validate pairing: both sides must point at each other
    const firstExpectedOpponent = first.expectedOpponentId;
    const firstUserId = first.user?.id;
    if (firstExpectedOpponent !== user.id || normalizedOpponentId !== firstUserId) {
      console.log(`❌ Direct invite ${normalizedInviteId} mismatch: first expected ${firstExpectedOpponent}, got ${user.id}; second expected ${normalizedOpponentId}, first user ${firstUserId}`);
      return { error: 'Direct invite mismatch' };
    }

    // Create a normal authenticated multiplayer game between these two users
    const result = this.createMultiplayerGameAuth(
      { connection: first.connection, connectionId: first.connectionId, user: first.user },
      { connection, connectionId, user }
    );

    // Remove invite entry once we attempt to create a game
    this.directInviteWaiting.delete(normalizedInviteId);

    return result;
  }

  // Generate unique connection ID
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique room ID
  generateRoomId() {
    return `room_${this.nextGameId++}`;
  }

  // Add a new authenticated player connection
  async addAuthenticatedPlayer(connection, user, gameMode = 'matchmaking', aiDifficulty = null) {
    // Check if user is already connected
    const existingPlayer = this.findPlayerByUserId(user.id);
    if (existingPlayer) {
      console.log(`User ${user.username} is already connected, disconnecting old connection`);
      await this.removePlayer(existingPlayer.connectionId);
    }

    const connectionId = this.generateConnectionId();
    
    if (gameMode === 'solo') {
      // Create a solo game (practice mode)
      return this.createSoloGameAuth(connection, connectionId, user, 'solo');
    } else if (gameMode === 'ai') {
      // Create an AI game
      return this.createSoloGameAuth(connection, connectionId, user, 'ai', aiDifficulty);
    } else if (gameMode === 'tournament') {
      // Add to tournament queue
      return this.addToTournamentQueue(connection, connectionId, user);
    } else {
      // Add to matchmaking queue
      return this.addToMatchmakingAuth(connection, connectionId, user);
    }
  }

  // Find player by user ID
  findPlayerByUserId(userId) {
    for (const [connectionId, playerData] of this.players.entries()) {
      if (playerData.user && playerData.user.id === userId) {
        return { connectionId, ...playerData };
      }
    }
    return null;
  }

  // Add a new player connection (legacy method, keep for compatibility)
  addPlayer(connection, gameMode = 'matchmaking', aiDifficulty = null) {
    const connectionId = this.generateConnectionId();
    
    if (gameMode === 'solo') {
      // Create a solo game (practice mode)
      return this.createSoloGame(connection, connectionId, 'solo');
    } else if (gameMode === 'ai') {
      // Create an AI game
      return this.createSoloGame(connection, connectionId, 'ai', aiDifficulty);
    } else {
      // Add to matchmaking queue
      return this.addToMatchmaking(connection, connectionId);
    }
  }

  // Create a solo game for practice
  createSoloGame(connection, connectionId, gameType = 'solo', aiDifficulty = null) {
    const roomId = this.generateRoomId();
    const gameState = new GameState(gameType, aiDifficulty);
    const gameLoop = new GameLoop(gameState, true); // Pass true for solo mode
    
    const game = {
      mode: gameType || 'solo',
      players: new Set([connectionId]),
      spectators: new Set(),
      gameState,
      gameLoop,
      createdAt: Date.now(),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false
    };

    this.games.set(roomId, game);
    
    // Register the player
    this.players.set(connectionId, {
      roomId,
      role: 'both',
      connection
    });

    // Initialize the game
    gameState.resetBall();

    console.log(`Created solo game ${roomId} for player ${connectionId}`);
    
    return {
      connectionId,
      roomId,
      role: 'both',
      gameType: 'solo',
      gameState: gameState.getState()
    };
  }

  // Create a solo game for authenticated user
  createSoloGameAuth(connection, connectionId, user, gameType = 'solo', aiDifficulty = null) {
    const roomId = this.generateRoomId();
    const gameState = new GameState(gameType, aiDifficulty);
    const gameLoop = new GameLoop(gameState, true); // Pass true for solo mode
    
    const game = {
      mode: gameType || 'solo',
      players: new Set([connectionId]),
      spectators: new Set(),
      gameState,
      gameLoop,
      createdAt: Date.now(),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false,
      authenticatedPlayers: new Map([[connectionId, user]])
    };

    this.games.set(roomId, game);
    
    // Register the authenticated player
    this.players.set(connectionId, {
      roomId,
      role: 'both',
      connection,
      user
    });

    // Initialize the game state but don't start countdown yet
    const initialState = gameState.getState();
    initialState.ball.dx = 0;
    initialState.ball.dy = 0;
    initialState.countdown = -1;
    initialState.gameActive = false;

    // Start the countdown after a brief delay to allow frontend to load
    setTimeout(() => {
      if (this.games.has(roomId)) {
        console.log(`⏰ Starting countdown for ${gameType} game ${roomId}`);
        gameState.resetBall();
      }
    }, 1000);

    console.log(`Created ${gameType} game ${roomId} for user ${user.username} (${user.id})`);
    
    return {
      connectionId,
      roomId,
      role: 'both',
      user,
      gameType,
      gameState: gameState.getState()
    };
  }

  // Add player to matchmaking queue
  addToMatchmaking(connection, connectionId) {
    // Check if there's a waiting player
    if (this.waitingPlayers.length > 0) {
      // Match with waiting player
      const waitingPlayer = this.waitingPlayers.shift();
      return this.createMultiplayerGame(waitingPlayer, { connection, connectionId });
    } else {
      // Add to waiting queue
      this.waitingPlayers.push({ connection, connectionId });
      
      this.players.set(connectionId, {
        roomId: null,
        role: 'waiting',
        connection
      });

      console.log(`Player ${connectionId} added to waiting queue`);
      
      return {
        connectionId,
        roomId: null,
        role: 'waiting',
        gameType: 'multiplayer',
        gameState: null
      };
    }
  }

  // Add authenticated user to matchmaking queue
  addToMatchmakingAuth(connection, connectionId, user) {
    console.log(`🎯 addToMatchmakingAuth called for ${user.username} (${user.id})`);
    console.log(`📊 Current waiting queue length: ${this.waitingPlayers.length}`);
    
    // Check if there's a waiting player
    if (this.waitingPlayers.length > 0) {
      console.log(`🎮 Found waiting player, attempting to create match...`);
      
      // Get waiting player and validate their connection
      const waitingPlayer = this.waitingPlayers.shift();
      
      // Validate that waiting player's connection is still valid
      if (!waitingPlayer.connection || waitingPlayer.connection.readyState !== 1) {
        console.log(`⚠️ Waiting player ${waitingPlayer.user.username} has invalid connection, removing and checking next...`);
        
        // Remove invalid player from players map
        this.players.delete(waitingPlayer.connectionId);
        
        // Try again with the next player (recursive call)
        return this.addToMatchmakingAuth(connection, connectionId, user);
      }
      
      console.log(`🔗 Matching ${user.username} with ${waitingPlayer.user.username}`);
      return this.createMultiplayerGameAuth(waitingPlayer, { connection, connectionId, user });
    } else {
      console.log(`⏳ No waiting players, adding ${user.username} to queue`);
      // Add to waiting queue
      this.waitingPlayers.push({ connection, connectionId, user });
      
      this.players.set(connectionId, {
        roomId: null,
        role: 'waiting',
        connection,
        user
      });

      console.log(`User ${user.username} (${user.id}) added to waiting queue`);
      
      return {
        connectionId,
        roomId: null,
        role: 'waiting',
        user,
        gameType: 'multiplayer',
        gameState: null
      };
    }
  }

  // Add authenticated user to tournament queue
  addToTournamentQueue(connection, connectionId, user) {
    console.log(`🏆 Adding ${user.username} to tournament queue`);
    
    // Check if player is already in an active tournament
    const existingPlayer = this.players.get(connectionId);
    if (existingPlayer && existingPlayer.tournamentId) {
      const existingTournament = this.tournamentManager.getTournament(existingPlayer.tournamentId);
      if (existingTournament && existingTournament.status !== 'completed') {
        console.log(`⚠️ ${user.username} is already in tournament ${existingPlayer.tournamentId} (status: ${existingTournament.status})`);
        // Return the current tournament info instead of adding to queue again
        return {
          queued: false,
          alreadyInTournament: true,
          tournamentId: existingPlayer.tournamentId,
          tournamentStatus: existingTournament.status
        };
      }
    }
    
    // Add player to tournament manager
    const result = this.tournamentManager.addPlayerToQueue(connection, user);
    
    // Store player data
    this.players.set(connectionId, {
      roomId: null,
      role: 'tournament_waiting',
      connection,
      user,
      tournamentId: result.tournamentId || null
    });
    
    if (result.status === 'tournament_started') {
      console.log(`🎪 Tournament ${result.tournamentId} starting with 8 players!`);
      
      // Notify all players that tournament is starting
      const tournament = this.tournamentManager.getTournament(result.tournamentId);
      if (tournament) {
        // Delay before creating first round matches to give players time to see the initial bracket
        const initialBracketDelay = 8000; // 8 seconds to see initial matchups
        console.log(`⏳ Showing initial tournament bracket for ${initialBracketDelay/1000} seconds...`);
        
        setTimeout(() => {
          console.log(`🚀 Starting quarter-finals matches now!`);
          // Create first round matches (quarter-finals)
          this.createTournamentMatches(tournament);
        }, initialBracketDelay);
      }
      
      // Clean bracket data - remove connection objects to avoid circular JSON
      const cleanBracket = {
        quarterFinals: result.bracket.quarterFinals.map(match => ({
          match: match.match,
          player1: { username: match.player1.user.username, id: match.player1.user.id },
          player2: { username: match.player2.user.username, id: match.player2.user.id },
          winner: match.winner
        })),
        semiFinals: result.bracket.semiFinals.map(match => ({
          match: match.match,
          player1: match.player1 ? { username: match.player1.user.username, id: match.player1.user.id } : null,
          player2: match.player2 ? { username: match.player2.user.username, id: match.player2.user.id } : null,
          winner: match.winner
        })),
        finals: {
          match: result.bracket.finals.match,
          player1: result.bracket.finals.player1 ? { username: result.bracket.finals.player1.user.username, id: result.bracket.finals.player1.user.id } : null,
          player2: result.bracket.finals.player2 ? { username: result.bracket.finals.player2.user.username, id: result.bracket.finals.player2.user.id } : null,
          winner: result.bracket.finals.winner
        }
      };
      
      return {
        started: true,
        tournamentId: result.tournamentId,
        bracket: cleanBracket
      };
    } else {
      console.log(`� ${user.username} joined tournament queue (${result.position}/8)`);
      
      return {
        queued: true,
        queuePosition: result.position,
        queueSize: result.position,
        playerList: result.queuedPlayers
      };
    }
  }

  // Create tournament matches for the current round
  async createTournamentMatches(tournament) {
    console.log(`📋 Creating matches for tournament ${tournament.id}, status: ${tournament.status}`);
    console.log(`📊 Current players in GameManager: ${this.players.size}`);
    
    let matches = [];
    
    if (tournament.status === 'quarter_finals') {
      matches = tournament.bracket.quarterFinals;
    } else if (tournament.status === 'semi_finals') {
      matches = tournament.bracket.semiFinals;
    } else if (tournament.status === 'finals') {
      matches = [tournament.bracket.finals];
    }
    
    console.log(`🎯 Found ${matches.length} matches to create`);
    
    // FIRST PASS: Find all connectionIds for all players across all matches
    const matchConnections = [];
    
    for (const match of matches) {
      if (match.player1 && match.player2 && !match.winner) {
        const player1Data = match.player1;
        const player2Data = match.player2;
        
        console.log(`🔍 Looking for connections - Match ${match.match}: ${player1Data.user.username} (ID: ${player1Data.user.id}) vs ${player2Data.user.username} (ID: ${player2Data.user.id})`);
        
        let player1ConnectionId = null;
        let player2ConnectionId = null;
        
        // Find connection IDs for these players
        for (const [connId, playerInfo] of this.players.entries()) {
          if (playerInfo.user && playerInfo.user.id === player1Data.user.id) {
            player1ConnectionId = connId;
            console.log(`   ✅ Found P1 connection: ${connId}`);
          }
          if (playerInfo.user && playerInfo.user.id === player2Data.user.id) {
            player2ConnectionId = connId;
            console.log(`   ✅ Found P2 connection: ${connId}`);
          }
        }
        
        if (!player1ConnectionId || !player2ConnectionId) {
          console.log(`❌ Could not find connections for tournament match ${match.match} - P1: ${player1ConnectionId}, P2: ${player2ConnectionId}`);
          
          // CRITICAL: Handle disconnected player case
          // If one player is connected and the other disconnected, award win to connected player
          if (player1ConnectionId && !player2ConnectionId) {
            console.log(`🏆 AUTO-ADVANCE: Player 2 (${player2Data.user.username}) disconnected, awarding win to Player 1 (${player1Data.user.username})`);
            
            // Record the win for player1
            const autoWinResult = this.tournamentManager.recordMatchResult(
              tournament.id,
              match.match,
              player1Data.user.id
            );
            
            if (autoWinResult.success) {
              // Update player stats for auto-advance (5-0 forfeit win)
              const autoWinGameResult = {
                player1Id: player1Data.user.id,
                player2Id: player2Data.user.id,
                player1Score: 5, // Winner gets max score
                player2Score: 0, // Disconnected player gets 0
                gameMode: 'tournament',
                gameDuration: 0, // Instant forfeit
                tournamentStage: tournament.status // Current tournament stage
              };
              
              try {
                await this.statsHandler.processGameCompletion(autoWinGameResult);
                console.log(`✅ Stats updated for auto-advance: ${player1Data.user.username} wins by forfeit`);
              } catch (error) {
                console.error(`❌ Error updating stats for auto-advance:`, error);
              }
              
              // Send notification to connected player
              const connectedPlayer = this.players.get(player1ConnectionId);
              if (connectedPlayer && connectedPlayer.connection && connectedPlayer.connection.readyState === 1) {
                connectedPlayer.connection.send(JSON.stringify({
                  type: 'tournamentMatchResult',
                  won: true,
                  opponentUsername: player2Data.user.username,
                  ratingChange: 0,
                  xpGain: 0,
                  round: autoWinResult.nextRound || 'complete',
                  tournamentComplete: autoWinResult.tournamentComplete || false,
                  isTournamentWinner: autoWinResult.status === 'tournament_complete',
                  waitingForNextRound: !autoWinResult.tournamentComplete && autoWinResult.nextRound,
                  opponentDisconnected: true,
                  stats: {
                    oldRating: 0,
                    newRating: 0,
                    oldXp: 0,
                    newXp: 0,
                    oldLevel: 1,
                    newLevel: 1
                  }
                }));
              }
              
              console.log(`✅ Auto-advance completed for match ${match.match}`);
              // Continue to check if round is complete
              continue;
            }
          } else if (player2ConnectionId && !player1ConnectionId) {
            console.log(`🏆 AUTO-ADVANCE: Player 1 (${player1Data.user.username}) disconnected, awarding win to Player 2 (${player2Data.user.username})`);
            
            // Record the win for player2
            const autoWinResult = this.tournamentManager.recordMatchResult(
              tournament.id,
              match.match,
              player2Data.user.id
            );
            
            if (autoWinResult.success) {
              // Update player stats for auto-advance (5-0 forfeit win)
              const autoWinGameResult = {
                player1Id: player1Data.user.id,
                player2Id: player2Data.user.id,
                player1Score: 0, // Disconnected player gets 0
                player2Score: 5, // Winner gets max score
                gameMode: 'tournament',
                gameDuration: 0, // Instant forfeit
                tournamentStage: tournament.status // Current tournament stage
              };
              
              try {
                await this.statsHandler.processGameCompletion(autoWinGameResult);
                console.log(`✅ Stats updated for auto-advance: ${player2Data.user.username} wins by forfeit`);
              } catch (error) {
                console.error(`❌ Error updating stats for auto-advance:`, error);
              }
              
              // Send notification to connected player
              const connectedPlayer = this.players.get(player2ConnectionId);
              if (connectedPlayer && connectedPlayer.connection && connectedPlayer.connection.readyState === 1) {
                connectedPlayer.connection.send(JSON.stringify({
                  type: 'tournamentMatchResult',
                  won: true,
                  opponentUsername: player1Data.user.username,
                  ratingChange: 0,
                  xpGain: 0,
                  round: autoWinResult.nextRound || 'complete',
                  tournamentComplete: autoWinResult.tournamentComplete || false,
                  isTournamentWinner: autoWinResult.status === 'tournament_complete',
                  waitingForNextRound: !autoWinResult.tournamentComplete && autoWinResult.nextRound,
                  opponentDisconnected: true,
                  stats: {
                    oldRating: 0,
                    newRating: 0,
                    oldXp: 0,
                    newXp: 0,
                    oldLevel: 1,
                    newLevel: 1
                  }
                }));
              }
              
              console.log(`✅ Auto-advance completed for match ${match.match}`);
              // Continue to check if round is complete
              continue;
            }
          }
          
          // If both disconnected, skip this match (unlikely but handle gracefully)
          console.log(`⚠️ Both players disconnected for match ${match.match}, skipping`);
          continue;
        }
        
        matchConnections.push({
          match,
          player1ConnectionId,
          player2ConnectionId,
          player1Data,
          player2Data
        });
      }
    }
    
    // SECOND PASS: Now create all the matches with the found connectionIds
    console.log(`🎯 Creating ${matchConnections.length} matches`);
    for (const matchInfo of matchConnections) {
      console.log(`🔨 Creating match ${matchInfo.match.match}: ${matchInfo.player1Data.user.username} vs ${matchInfo.player2Data.user.username}`);
      this.createTournamentMatch(tournament.id, matchInfo);
    }
    
    // THIRD PASS: Check if all matches were auto-advanced (no actual matches created)
    // This happens when all opponents disconnected
    if (matchConnections.length === 0 && matches.length > 0) {
      console.log(`🔍 All matches in round were auto-advanced due to disconnections`);
      
      // Check if round is complete after auto-advances
      const tournamentAfterAutoAdvance = this.tournamentManager.getTournament(tournament.id);
      if (tournamentAfterAutoAdvance) {
        const allMatchesComplete = matches.every(m => m.winner !== null);
        
        if (allMatchesComplete) {
          console.log(`✅ Round complete after auto-advances! Advancing tournament...`);
          
          // Trigger next round creation after delay
          setTimeout(() => {
            const updatedTournament = this.tournamentManager.getTournament(tournament.id);
            if (updatedTournament && updatedTournament.status !== 'completed') {
              console.log(`🚀 Creating next round matches after auto-advance`);
              this.createTournamentMatches(updatedTournament);
            }
          }, 3000); // 3 second delay before next round
        }
      }
    }
  }

  // Create a single tournament match
  createTournamentMatch(tournamentId, matchInfo) {
    const match = matchInfo.match;
    const player1ConnectionId = matchInfo.player1ConnectionId;
    const player2ConnectionId = matchInfo.player2ConnectionId;
    const player1Data = matchInfo.player1Data;
    const player2Data = matchInfo.player2Data;
    
    const roomId = this.generateRoomId();
    const gameState = new GameState('tournament');
    const gameLoop = new GameLoop(gameState);
    
    // Determine tournament stage from tournament status
    const tournament = this.tournamentManager.getTournament(tournamentId);
    let tournamentStage = null;
    if (tournament) {
      if (tournament.status === 'quarter_finals') tournamentStage = 'quarter';
      else if (tournament.status === 'semi_finals') tournamentStage = 'semi';
      else if (tournament.status === 'finals') tournamentStage = 'final';
    }

    const gameRoom = {
      mode: 'tournament',
      tournamentId: tournamentId,
      matchId: match.match,
      tournamentStage: tournamentStage, // Add tournament stage
      gameState,
      gameLoop,
      players: new Set([player1ConnectionId, player2ConnectionId]),
      spectators: new Set(),
      authenticatedPlayers: new Map([
        [player1ConnectionId, player1Data.user],
        [player2ConnectionId, player2Data.user]
      ]),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false
    };

    this.games.set(roomId, gameRoom);
    
    // Update player data with room assignment
    this.players.set(player1ConnectionId, {
      roomId,
      role: 'player1',
      connection: player1Data.connection,
      user: player1Data.user,
      tournamentId: tournamentId,
      matchId: match.match
    });
    
    this.players.set(player2ConnectionId, {
      roomId,
      role: 'player2',
      connection: player2Data.connection,
      user: player2Data.user,
      tournamentId: tournamentId,
      matchId: match.match
    });

    // Initialize game
    gameState.resetBall();

    console.log(`🏆 Created tournament match ${match.match}: ${player1Data.user.username} vs ${player2Data.user.username} (Room: ${roomId})`);
    
    // Send match start messages to both players
    const matchStartMsg = {
      type: 'tournamentMatchReady',
      tournamentId: tournamentId,
      matchId: match.match,
      roomId: roomId,
      round: this.tournamentManager.getTournament(tournamentId).status,
      gameState: gameState.getState(),
      matchData: {
        player1: {
          connectionId: player1ConnectionId,
          role: 'player1',
          user: player1Data.user,
          roomId: roomId
        },
        player2: {
          connectionId: player2ConnectionId,
          role: 'player2',
          user: player2Data.user,
          roomId: roomId
        }
      }
    };
    
    if (player1Data.connection) {
      player1Data.connection.send(JSON.stringify({
        ...matchStartMsg,
        playerRole: 'player1',
        user: player1Data.user,  // Add user field for frontend
        opponent: {
          id: player2Data.user.id,
          username: player2Data.user.username,
          first_name: player2Data.user.first_name || player2Data.user.firstName,
          firstName: player2Data.user.firstName || player2Data.user.first_name,
          last_name: player2Data.user.last_name || player2Data.user.lastName,
          lastName: player2Data.user.lastName || player2Data.user.last_name,
          profile_pic: player2Data.user.profile_pic || player2Data.user.profilePic,
          profilePic: player2Data.user.profilePic || player2Data.user.profile_pic,
          avatar_updated_at: player2Data.user.avatar_updated_at
        }
      }));
    }
    
    if (player2Data.connection) {
      player2Data.connection.send(JSON.stringify({
        ...matchStartMsg,
        playerRole: 'player2',
        user: player2Data.user,  // Add user field for frontend
        opponent: {
          id: player1Data.user.id,
          username: player1Data.user.username,
          first_name: player1Data.user.first_name || player1Data.user.firstName,
          firstName: player1Data.user.firstName || player1Data.user.first_name,
          last_name: player1Data.user.last_name || player1Data.user.lastName,
          lastName: player1Data.user.lastName || player1Data.user.last_name,
          profile_pic: player1Data.user.profile_pic || player1Data.user.profilePic,
          profilePic: player1Data.user.profilePic || player1Data.user.profile_pic,
          avatar_updated_at: player1Data.user.avatar_updated_at
        }
      }));
    }
  }

  // Create a multiplayer game between two players
  createMultiplayerGame(player1Data, player2Data) {
    const roomId = this.generateRoomId();
    const gameState = new GameState();
    const gameLoop = new GameLoop(gameState);
    
    const gameRoom = {
      mode: 'multiplayer',
      gameState,
      gameLoop,
      players: new Set([player1Data.connectionId, player2Data.connectionId]),
      spectators: new Set(),
      authenticatedPlayers: new Map([
        [player1Data.connectionId, player1Data.user],
        [player2Data.connectionId, player2Data.user]
      ]),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false
    };

    this.games.set(roomId, gameRoom);
    
    // Assign roles WITH user data
    this.players.set(player1Data.connectionId, {
      roomId,
      role: 'player1',
      connection: player1Data.connection,
      user: player1Data.user
    });
    
    this.players.set(player2Data.connectionId, {
      roomId,
      role: 'player2',
      connection: player2Data.connection,
      user: player2Data.user
    });

    // Initialize game
    gameState.resetBall();

    console.log(`Created multiplayer game ${roomId}: ${player1Data.connectionId} vs ${player2Data.connectionId}`);
    
    // Return info for both players
    return {
      player1: {
        connectionId: player1Data.connectionId,
        roomId,
        role: 'player1',
        gameType: 'multiplayer',
        gameState: gameState.getState()
      },
      player2: {
        connectionId: player2Data.connectionId,
        roomId,
        role: 'player2',
        gameType: 'multiplayer',
        gameState: gameState.getState()
      }
    };
  }

  // Create an authenticated multiplayer game between two users
  createMultiplayerGameAuth(player1Data, player2Data) {
    console.log(`🎮 createMultiplayerGameAuth called:`);
    console.log(`  👤 Player1 (first to join): ${player1Data.user.username} (ID: ${player1Data.user.id}) → role: player1`);
    console.log(`  👤 Player2 (second to join): ${player2Data.user.username} (ID: ${player2Data.user.id}) → role: player2`);
    
    // Validate both connections before creating game
    if (!player1Data.connection || player1Data.connection.readyState !== 1) {
      console.error(`❌ Player1 ${player1Data.user.username} has invalid connection, cannot create game`);
      return null;
    }
    
    if (!player2Data.connection || player2Data.connection.readyState !== 1) {
      console.error(`❌ Player2 ${player2Data.user.username} has invalid connection, cannot create game`);
      return null;
    }
    
    const roomId = this.generateRoomId();
    const gameState = new GameState();
    const gameLoop = new GameLoop(gameState);
    
    const gameRoom = {
      mode: 'multiplayer',
      gameState,
      gameLoop,
      players: new Set([player1Data.connectionId, player2Data.connectionId]),
      spectators: new Set(),
      authenticatedPlayers: new Map([
        [player1Data.connectionId, player1Data.user],
        [player2Data.connectionId, player2Data.user]
      ]),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false
    };

    this.games.set(roomId, gameRoom);
    
    // Assign roles with user data
    this.players.set(player1Data.connectionId, {
      roomId,
      role: 'player1',
      connection: player1Data.connection,
      user: player1Data.user
    });
    
    this.players.set(player2Data.connectionId, {
      roomId,
      role: 'player2',
      connection: player2Data.connection,
      user: player2Data.user
    });

    // Initialize game - but don't start countdown yet
    // Countdown will start after Match Ready screen (handled by frontend timeout)
    // Set initial game state without countdown
    gameState.gameState.ball = { 
      x: gameState.constants.CANVAS_WIDTH / 2, 
      y: gameState.constants.CANVAS_HEIGHT / 2, 
      dx: 0, 
      dy: 0 
    };
    gameState.gameState.countdown = -1; // No countdown yet
    gameState.gameState.gameActive = false;

    // Start the countdown after 4 seconds (match ready screen duration)
    setTimeout(() => {
      if (this.games.has(roomId)) {
        console.log(`⏰ Starting countdown for room ${roomId} after Match Ready screen`);
        gameState.resetBall();
      }
    }, 4000);

    console.log(`Created authenticated multiplayer game ${roomId}: ${player1Data.user.username} vs ${player2Data.user.username}`);
    
    // Return info for both players with opponent data
    return {
      player1: {
        connectionId: player1Data.connectionId,
        roomId,
        role: 'player1',
        user: player1Data.user,
        connection: player1Data.connection, // Include connection for message sending
        gameType: 'multiplayer',
        gameState: gameState.getState(),
        opponent: {
          id: player2Data.user.id,
          username: player2Data.user.username,
          name: player2Data.user.name,
          first_name: player2Data.user.first_name || player2Data.user.firstName,
          firstName: player2Data.user.firstName || player2Data.user.first_name,
          last_name: player2Data.user.last_name || player2Data.user.lastName,
          lastName: player2Data.user.lastName || player2Data.user.last_name,
          profile_pic: player2Data.user.profile_pic || player2Data.user.profilePic,
          profilePic: player2Data.user.profilePic || player2Data.user.profile_pic,
          avatar_updated_at: player2Data.user.avatar_updated_at,
          level: player2Data.user.gameStats?.level || 1,
          rankTier: player2Data.user.gameStats?.rankTier || 'Bronze'
        }
      },
      player2: {
        connectionId: player2Data.connectionId,
        roomId,
        role: 'player2',
        user: player2Data.user,
        connection: player2Data.connection, // Include connection for message sending
        gameType: 'multiplayer',
        gameState: gameState.getState(),
        opponent: {
          id: player1Data.user.id,
          username: player1Data.user.username,
          name: player1Data.user.name,
          first_name: player1Data.user.first_name || player1Data.user.firstName,
          firstName: player1Data.user.firstName || player1Data.user.first_name,
          last_name: player1Data.user.last_name || player1Data.user.lastName,
          lastName: player1Data.user.lastName || player1Data.user.last_name,
          profile_pic: player1Data.user.profile_pic || player1Data.user.profilePic,
          profilePic: player1Data.user.profilePic || player1Data.user.profile_pic,
          avatar_updated_at: player1Data.user.avatar_updated_at,
          level: player1Data.user.gameStats?.level || 1,
          rankTier: player1Data.user.gameStats?.rankTier || 'Bronze'
        }
      }
    };
  }

  // Handle player input
  handlePlayerInput(connectionId, inputData) {
    const player = this.players.get(connectionId);
    if (!player || !player.roomId) return;

    const gameRoom = this.games.get(player.roomId);
    if (!gameRoom) return;

    if (inputData.type === 'update') {
      // Handle movement based on player role and game mode
      const isSolo = gameRoom.mode === 'solo';
      const isTournament = !!gameRoom.tournamentId;
      
      // Debug all player inputs
      console.log(`🎮 GameManager received from ${connectionId} (${player.role}):`, inputData);
      
      if (player.role === 'player1') {
        console.log(`➡️ Calling updatePlayerMovement for Player 1: p1DY=${inputData.player1DY || 0}`);
        gameRoom.gameState.updatePlayerMovement(inputData.player1DY || 0, null, 'player1', false, isTournament);
      } else if (player.role === 'player2') {
        console.log(`➡️ Calling updatePlayerMovement for Player 2: p2DY=${inputData.player2DY || 0}`);
        gameRoom.gameState.updatePlayerMovement(null, inputData.player2DY || 0, 'player2', false, isTournament);
      } else if (player.role === 'both') {
        console.log(`➡️ Calling updatePlayerMovement for Solo: p1DY=${inputData.player1DY || 0}, p2DY=${inputData.player2DY || 0}`);
        // Solo mode - handle both players
        gameRoom.gameState.updatePlayerMovement(inputData.player1DY || 0, inputData.player2DY || 0, null, true, false);
      }
    } else if (inputData.type === 'reset') {
      console.log(`Reset requested by ${connectionId} in room ${player.roomId}`);
      
      if (gameRoom.mode === 'solo') {
        // In solo mode, just reset the game
        gameRoom.gameState.resetGame();
      } else {
        // In multiplayer mode, remove player from game and return to waiting
        this.removePlayerFromGame(connectionId);
        
        // Send player back to game selection
        player.connection.send(JSON.stringify({
          type: 'gameLeft',
          message: 'You left the game. Choose a new game mode.'
        }));
      }
    }
  }

  // Update all games
  async updateAllGames() {
    for (const [roomId, gameRoom] of this.games) {
      const gameState = gameRoom.gameState.getState();
      const wasActive = gameRoom.wasActive !== false; // Track if game was previously active
      
      // Store final scores if game just finished
      if (gameState.winner && wasActive && !gameRoom.gameProcessed && !gameRoom.finalScores) {
        gameRoom.finalScores = {
          player1Score: gameState.player1.score,
          player2Score: gameState.player2.score,
          winner: gameState.winner,
          timestamp: Date.now()
        };
        console.log(`🎯 FINAL SCORES STORED for ${roomId}: P1=${gameRoom.finalScores.player1Score}, P2=${gameRoom.finalScores.player2Score}, Winner: ${gameRoom.finalScores.winner}`);
      }
      
      // Check if game just ended (only process when there's actually a winner)
      if (gameState.winner && wasActive && !gameRoom.gameProcessed) {
        console.log(`🏁 Game ${roomId} just ended! Winner: ${gameState.winner}`);
        console.log(`🎯 Final scores at game end: P1=${gameState.player1.score}, P2=${gameState.player2.score}`);
        console.log(`🎯 RAW GAME STATE AT END:`, JSON.stringify(gameState, null, 2));
        
        // Use stored final scores if available, otherwise use current game state
        const finalP1Score = gameRoom.finalScores ? gameRoom.finalScores.player1Score : gameState.player1.score;
        const finalP2Score = gameRoom.finalScores ? gameRoom.finalScores.player2Score : gameState.player2.score;
        console.log(`🎯 USING SCORES: P1=${finalP1Score}, P2=${finalP2Score} (from ${gameRoom.finalScores ? 'stored' : 'current'} data)`);
        
        // Check if game was aborted due to early disconnection
        if (gameRoom.aborted) {
          console.log(`🚫 Game ${roomId} was aborted - skipping all processing`);
          gameRoom.gameProcessed = true;
          this.processedGames.add(roomId);
          gameRoom.gameEndTime = Date.now();
          continue;
        }
        
        // Only process stats if game actually had meaningful gameplay
        // Check if someone reached the winning score (5 points) or if there was actual scoring
        const totalScore = finalP1Score + finalP2Score;
        const someoneReachedWinningScore = finalP1Score >= 5 || finalP2Score >= 5;
        const hadMeaningfulGameplay = totalScore >= 1 || someoneReachedWinningScore;
        
        console.log(`🔍 Game completion validation:`, {
          totalScore,
          someoneReachedWinningScore,
          hadMeaningfulGameplay,
          winner: gameState.winner,
          countdown: gameState.countdown,
          aborted: gameRoom.aborted
        });
        
        // Set end time but DON'T mark as processed yet (let processGameCompletion do that)
        gameRoom.gameEndTime = Date.now();
        
        if (hadMeaningfulGameplay) {
          // Create a snapshot of the final game state with captured scores
          const finalGameState = {
            ...gameState,
            player1: { ...gameState.player1, score: finalP1Score },
            player2: { ...gameState.player2, score: finalP2Score }
          };
          
          console.log(`✅ Processing stats for completed game with meaningful gameplay`);
          // Process game completion for stats (pass scores immediately to avoid reset issues)
          this.processGameCompletion(roomId, gameRoom, finalGameState)
            .catch(err => console.error(`❌ Error processing game completion for ${roomId}:`, err));
        } else {
          console.log(`⚠️ Skipping stats processing - game ended without meaningful gameplay (disconnection during countdown/early game)`);
          // Mark as processed even if we skip stats (no meaningful gameplay)
          gameRoom.gameProcessed = true;
          this.processedGames.add(roomId);
        }
        
        continue;
      }
      
      // Skip updating if game has a winner (truly finished), but clean up after timeout
      if (gameState.winner) {
        // Remove finished games after 5 seconds to prevent infinite logging
        const timeSinceEnd = gameRoom.gameEndTime ? (Date.now() - gameRoom.gameEndTime) : 0;
        if (timeSinceEnd > 5000) {
          console.log(`🧹 Cleaning up finished game ${roomId} (${timeSinceEnd}ms old)`);
          this.games.delete(roomId);
          continue;
        }
        
        gameRoom.wasActive = false;
        continue;
      }
      
      // Mark game as active (including countdown periods)
      const wasInactive = !gameRoom.wasActive;
      gameRoom.wasActive = true;
      
      // Track when game actually starts (when it becomes active with ball moving)
      if (wasInactive && gameState.gameActive && !gameRoom.actualGameStartTime) {
        gameRoom.actualGameStartTime = Date.now();
        console.log(`🎮 Game ${roomId} actually started (ball is now moving) at ${gameRoom.actualGameStartTime}`);
      }
      
      // Update game physics (this will handle countdown internally)
      gameRoom.gameLoop.updateGame();
      
      // Broadcast to all players in this room
      await this.broadcastToRoom(roomId, gameState);
    }
  }

  // Broadcast message to all players in a room
  async broadcastToRoom(roomId, message) {
    const gameRoom = this.games.get(roomId);
    if (!gameRoom) return;

    const messageStr = JSON.stringify(message);
    const deadConnections = [];
    
    // Send to all players
    for (const connectionId of gameRoom.players) {
      const player = this.players.get(connectionId);
      if (!player) continue;
      
      // Check connection state
      if (player.connection.readyState !== 1) { // Not OPEN
        console.log(`Connection ${connectionId} not open (state: ${player.connection.readyState}), removing player`);
        deadConnections.push(connectionId);
        continue;
      }
      
      try {
        player.connection.send(messageStr);
      } catch (error) {
        console.log(`Failed to send to ${connectionId}: ${error.message}, removing player`);
        deadConnections.push(connectionId);
      }
    }
    
    // Send to spectators
    for (const connectionId of gameRoom.spectators) {
      const spectator = this.players.get(connectionId);
      if (!spectator) continue;
      
      if (spectator.connection.readyState !== 1) {
        deadConnections.push(connectionId);
        continue;
      }
      
      try {
        spectator.connection.send(messageStr);
      } catch (error) {
        console.log(`Failed to send to spectator ${connectionId}: ${error.message}`);
        deadConnections.push(connectionId);
      }
    }
    
    // Remove dead connections
    for (const connectionId of deadConnections) {
      console.log(`Removing dead connection: ${connectionId}`);
      await this.removePlayer(connectionId);
    }
  }

  // Remove player from current game but keep connection alive
  removePlayerFromGame(connectionId) {
    const player = this.players.get(connectionId);
    if (!player || !player.roomId) return;

    const gameRoom = this.games.get(player.roomId);
    if (gameRoom) {
      // Remove from game room
      gameRoom.players.delete(connectionId);
      
      // Clean up game if no players left
      if (gameRoom.players.size === 0) {
        gameRoom.gameState.cleanup();
        this.games.delete(player.roomId);
        console.log(`Deleted empty game room ${player.roomId}`);
      } else {
        // Notify remaining players
        const remainingPlayers = Array.from(gameRoom.players);
        for (const playerId of remainingPlayers) {
          const otherPlayer = this.players.get(playerId);
          if (otherPlayer && otherPlayer.connection.readyState === 1) {
            otherPlayer.connection.send(JSON.stringify({
              type: 'playerLeft',
              message: 'Your opponent left the game.'
            }));
          }
        }
      }
    }

    // Update player info to remove room assignment
    this.players.set(connectionId, {
      ...player,
      roomId: null,
      role: 'waiting'
    });
  }

  // Remove player and clean up
  async removePlayer(connectionId) {
    const player = this.players.get(connectionId);
    if (!player) return;

    // Remove from waiting queue if present
    this.waitingPlayers = this.waitingPlayers.filter(p => p.connectionId !== connectionId);

    // Remove from direct-invite waiting if present
    for (const [inviteId, entry] of this.directInviteWaiting.entries()) {
      if (entry?.player?.connectionId === connectionId) {
        this.directInviteWaiting.delete(inviteId);
        console.log(`🧹 Removed ${connectionId} from direct invite ${inviteId}`);
        break;
      }
    }

    // Remove from tournament queue if present
    if (player.user && player.user.id) {
      const removed = this.tournamentManager.removePlayerFromQueue(player.user.id);
      if (removed) {
        console.log(`🏆 Removed ${player.user.username} from tournament queue`);
      }
    }

    if (player.roomId) {
      const gameRoom = this.games.get(player.roomId);
      if (gameRoom) {
        const gameState = gameRoom.gameState.getState();
        const totalScore = gameState.player1.score + gameState.player2.score;
        
        console.log(`🔌 Player disconnection in room ${player.roomId}:`, {
          playersRemaining: gameRoom.players.size - 1,
          totalScore,
          countdown: gameState.countdown,
          gameActive: gameState.gameActive,
          mode: gameRoom.mode
        });
        
        // Remove from game room
        gameRoom.players.delete(connectionId);
        gameRoom.spectators.delete(connectionId);
        
        // Clean up game state
        gameRoom.gameState.cleanup();
        
        // If no players left, remove the game
        if (gameRoom.players.size === 0) {
          console.log(`Removing empty game room ${player.roomId}`);
          this.games.delete(player.roomId);
        } else {
          // ANY disconnection after game is created = award win to remaining player
          console.log(`⚡ Player disconnected in ${player.roomId} - awarding win to remaining player`);
          
          const remainingPlayers = Array.from(gameRoom.players);
          if (remainingPlayers.length === 1) {
            const winnerId = remainingPlayers[0];
            const winnerData = this.players.get(winnerId);
            const disconnectedData = player;
            
            if (winnerData) {
              // Determine which player role disconnected
              const winnerRole = winnerData.role;
              const loserRole = disconnectedData.role;
              
              // Set final scores - winner gets 5, disconnected player keeps current score
              const currentState = gameRoom.gameState.getState();
              const winnerScore = 5; // Max score
              const loserScore = winnerRole === 'player1' ? currentState.player2.score : currentState.player1.score;
              
              // Update game state to reflect the win
              gameRoom.finalScores = {
                player1Score: winnerRole === 'player1' ? winnerScore : loserScore,
                player2Score: winnerRole === 'player2' ? winnerScore : loserScore
              };
              
              // Mark game as finished - update scores in the actual state
              if (winnerRole === 'player1') {
                currentState.player1.score = winnerScore;
                currentState.player2.score = loserScore;
              } else {
                currentState.player1.score = loserScore;
                currentState.player2.score = winnerScore;
              }
              currentState.winner = winnerRole === 'player1' ? 'Player 1' : 'Player 2';
              currentState.gameActive = false;
              gameRoom.gameEndTime = Date.now();
              
              console.log(`🏆 Awarding win by disconnection: ${winnerData.user.username} defeats ${disconnectedData.user.username} (${winnerScore}-${loserScore})`);
              
              // DON'T send game state - will cause frozen screen
              // Instead, let the processGameCompletion send the win screen directly
              
              // Stop the game loop for this room
              if (gameRoom.gameInterval) {
                clearInterval(gameRoom.gameInterval);
                gameRoom.gameInterval = null;
                console.log(`⏹️ Stopped game loop for ${player.roomId}`);
              }
              
              // Store disconnected player info for stats processing
              gameRoom.disconnectedPlayer = disconnectedData;
              console.log(`💾 Stored disconnected player info: ${disconnectedData.user.username} (role: ${disconnectedData.role})`);
              
              // Immediately process game completion to generate win screen
              // (Will mark as processed inside the function)
              if (gameRoom.mode === 'tournament') {
                console.log(`🏆 Tournament match - processing tournament result immediately`);
                // Process tournament match immediately
                await this.processTournamentMatch(player.roomId, gameRoom, currentState).catch(err => {
                  console.error(`❌ Error processing tournament match on disconnect:`, err);
                  gameRoom.gameProcessed = true;
                  this.processedGames.add(player.roomId); // Mark as processed even on error
                });
              } else if (gameRoom.mode === 'multiplayer') {
                console.log(`🏆 Multiplayer/Matchmaking match - processing game completion immediately`);
                // Process regular game completion immediately (this sends win screen)
                await this.processGameCompletion(player.roomId, gameRoom, currentState).catch(err => {
                  console.error(`❌ Error processing game completion on disconnect:`, err);
                  gameRoom.gameProcessed = true;
                  this.processedGames.add(player.roomId); // Mark as processed even on error
                });
              } else {
                // Solo/AI mode - just notify and end
                console.log(`⚠️ Solo/AI mode disconnect - no stats update needed`);
                gameRoom.gameProcessed = true;
                this.processedGames.add(player.roomId);
                if (winnerData.connection && winnerData.connection.readyState === 1) {
                  winnerData.connection.send(JSON.stringify({
                    type: 'opponentDisconnected',
                    message: 'Opponent disconnected. Game ended.',
                    winner: true
                  }));
                }
              }
            }
          }
        }
      }
    }

    this.players.delete(connectionId);
    console.log(`Player ${connectionId} removed from game manager`);
  }

  // Get player info
  getPlayerInfo(connectionId) {
    return this.players.get(connectionId);
  }

  // Get game room info
  getGameRoom(roomId) {
    return this.games.get(roomId);
  }

  // Get stats
  getStats() {
    return {
      totalGames: this.games.size,
      totalPlayers: this.players.size,
      waitingPlayers: this.waitingPlayers.length,
      games: Array.from(this.games.entries()).map(([roomId, room]) => ({
        roomId,
        playerCount: room.players.size,
        type: room.type
      }))
    };
  }

  // Process tournament match completion
  async processTournamentMatch(roomId, gameRoom, gameState) {
    try {
      console.log(`🏆 Processing tournament match: ${gameRoom.matchId} in tournament ${gameRoom.tournamentId}`);
      
      // Get final scores
      const scores = {
        player1: gameRoom.finalScores?.player1Score || gameState.player1?.score || 0,
        player2: gameRoom.finalScores?.player2Score || gameState.player2?.score || 0
      };
      
      console.log(`📊 Tournament match scores: P1=${scores.player1}, P2=${scores.player2}`);
      
      // Get user data for both players by their roles (not by array position)
      let player1Data = null;
      let player2Data = null;
      
      // First, try to get players who are still connected
      // gameRoom.players is a Set of connection IDs
      for (const connectionId of gameRoom.players) {
        const playerData = this.players.get(connectionId);
        if (playerData) {
          if (playerData.role === 'player1') {
            player1Data = playerData;
            console.log(`📝 Found connected player1: ${playerData.user.username}`);
          } else if (playerData.role === 'player2') {
            player2Data = playerData;
            console.log(`📝 Found connected player2: ${playerData.user.username}`);
          }
        }
      }
      
      // If a player is missing, check if they disconnected and use stored data
      if (!player1Data && gameRoom.disconnectedPlayer && gameRoom.disconnectedPlayer.role === 'player1') {
        console.log(`📝 Using stored disconnected player data for player1: ${gameRoom.disconnectedPlayer.user.username}`);
        player1Data = gameRoom.disconnectedPlayer;
      }
      if (!player2Data && gameRoom.disconnectedPlayer && gameRoom.disconnectedPlayer.role === 'player2') {
        console.log(`📝 Using stored disconnected player data for player2: ${gameRoom.disconnectedPlayer.user.username}`);
        player2Data = gameRoom.disconnectedPlayer;
      }
      
      if (!player1Data || !player2Data) {
        console.error('❌ Missing player data for tournament match (even after checking disconnectedPlayer)');
        console.error(`   player1Data: ${player1Data ? player1Data.user.username + ' (role: ' + player1Data.role + ')' : 'NULL'}`);
        console.error(`   player2Data: ${player2Data ? player2Data.user.username + ' (role: ' + player2Data.role + ')' : 'NULL'}`);
        console.error(`   disconnectedPlayer: ${gameRoom.disconnectedPlayer ? gameRoom.disconnectedPlayer.user.username + ' (role: ' + gameRoom.disconnectedPlayer.role + ')' : 'NULL'}`);
        return;
      }

      // Determine winner
      const player1Won = scores.player1 > scores.player2;
      const winnerData = player1Won ? player1Data : player2Data;
      const loserData = player1Won ? player2Data : player1Data;

      // Record match result in tournament manager
      const tournamentResult = this.tournamentManager.recordMatchResult(
        gameRoom.tournamentId,
        gameRoom.matchId,
        winnerData.user.id
      );

      if (!tournamentResult.success) {
        console.error(`❌ Failed to record tournament match result: ${tournamentResult.message}`);
        return;
      }

      console.log(`✅ Tournament match recorded: ${winnerData.user.username} defeats ${loserData.user.username}`);

      // ========================================
      // USE MATCHMAKING'S PROVEN DATABASE UPDATE
      // ========================================
      
      // Ensure gameEndTime is set (safety check)
      if (!gameRoom.gameEndTime) {
        console.log(`⚠️ Tournament game: gameEndTime not set for room ${roomId}, setting it now`);
        gameRoom.gameEndTime = Date.now();
      }
      
      // Calculate duration with safety check
      // Priority: actualGameStartTime > gameStartTime > use a fallback
      let startTime = gameRoom.actualGameStartTime || gameRoom.gameStartTime;
      
      if (!startTime) {
        console.warn(`⚠️ Tournament: No start time found for room ${roomId}, using fallback`);
        startTime = gameRoom.gameEndTime - 60000; // Assume 60 second game as fallback
      }
      
      const gameDuration = Math.floor((gameRoom.gameEndTime - startTime) / 1000);
      
      console.log(`🔍 Tournament duration debug:`, {
        gameStartTime: gameRoom.gameStartTime,
        actualGameStartTime: gameRoom.actualGameStartTime,
        gameEndTime: gameRoom.gameEndTime,
        usingStartTime: startTime,
        calculatedDuration: gameDuration,
        willUseActual: !!gameRoom.actualGameStartTime
      });
      
      // Create game result object (same format as matchmaking)
      const gameResult = {
        player1Id: player1Data.user.id,
        player2Id: player2Data.user.id,
        player1Score: scores.player1,
        player2Score: scores.player2,
        gameMode: 'tournament',
        gameDuration: gameDuration,
        tournamentStage: gameRoom.tournamentStage // Add tournament stage
      };
      
      // Generate win screen data BEFORE updating database (gets before stats)
      const winScreenData = await this.winScreenData.generateWinScreenData(
        gameResult,
        player1Data,
        player2Data
      );
      
      console.log(`🚨🚨🚨 WIN SCREEN DATA: ${winScreenData ? 'GENERATED ✅' : 'NULL ❌'} 🚨🚨🚨`);
      
      // Mark as processed to prevent duplicate processing (both local and global)
      gameRoom.gameProcessed = true;
      this.processedGames.add(roomId);
      console.log(`✅ Tournament game ${roomId} marked as processed in global set`);
      
      // Use matchmaking's proven database update function
      await this.statsHandler.processGameCompletion(gameResult);
      
      console.log(`💰 Stats updated using matchmaking's database function`);

      // ========================================
      // SEND TOURNAMENT-SPECIFIC WIN/LOSS SCREENS
      // ========================================
      
      const hasNextRound = tournamentResult.nextRound && !tournamentResult.tournamentComplete;
      
      // Send tournament win screen to player 1
      if (winScreenData && player1Data.connection && player1Data.connection.readyState === 1) {
        console.log(`🚨🚨🚨 SENDING TOURNAMENT RESULT TO ${player1Data.user.username} 🚨🚨🚨`);
        player1Data.connection.send(JSON.stringify({
          type: 'tournamentMatchResult',
          won: player1Won,
          opponentUsername: player2Data.user.username,
          ratingChange: winScreenData.player1.rewards.rankPoints,
          xpGain: winScreenData.player1.rewards.experience,
          round: player1Won ? (tournamentResult.nextRound || 'complete') : 'eliminated',
          tournamentComplete: player1Won ? (tournamentResult.tournamentComplete || false) : false,
          isTournamentWinner: player1Won && (tournamentResult.status === 'tournament_complete'),
          waitingForNextRound: player1Won && hasNextRound,
          stats: {
            oldRating: winScreenData.player1.progression.before.rankPoints,
            newRating: winScreenData.player1.progression.after.rankPoints,
            oldXp: winScreenData.player1.progression.before.experience,
            newXp: winScreenData.player1.progression.after.experience,
            oldLevel: winScreenData.player1.progression.before.level,
            newLevel: winScreenData.player1.progression.after.level,
            totalMatches: winScreenData.player1.progression.after.gamesPlayed,
            wins: winScreenData.player1.progression.after.gamesWon,
            losses: winScreenData.player1.progression.after.gamesLost
          }
        }));
      }
      
      // Send tournament win screen to player 2
      if (winScreenData && player2Data.connection && player2Data.connection.readyState === 1) {
        console.log(`🚨🚨🚨 SENDING TOURNAMENT RESULT TO ${player2Data.user.username} 🚨🚨🚨`);
        player2Data.connection.send(JSON.stringify({
          type: 'tournamentMatchResult',
          won: !player1Won,
          opponentUsername: player1Data.user.username,
          ratingChange: winScreenData.player2.rewards.rankPoints,
          xpGain: winScreenData.player2.rewards.experience,
          round: !player1Won ? (tournamentResult.nextRound || 'complete') : 'eliminated',
          tournamentComplete: !player1Won ? (tournamentResult.tournamentComplete || false) : false,
          isTournamentWinner: !player1Won && (tournamentResult.status === 'tournament_complete'),
          waitingForNextRound: !player1Won && hasNextRound,
          stats: {
            oldRating: winScreenData.player2.progression.before.rankPoints,
            newRating: winScreenData.player2.progression.after.rankPoints,
            oldXp: winScreenData.player2.progression.before.experience,
            newXp: winScreenData.player2.progression.after.experience,
            oldLevel: winScreenData.player2.progression.before.level,
            newLevel: winScreenData.player2.progression.after.level,
            totalMatches: winScreenData.player2.progression.after.gamesPlayed,
            wins: winScreenData.player2.progression.after.gamesWon,
            losses: winScreenData.player2.progression.after.gamesLost
          }
        }));
      }
      
      // Update both players' states to 'waiting'
      // Find connection IDs for winner and loser
      let winnerConnectionId = null;
      let loserConnectionId = null;
      
      for (const [connId, playerData] of this.players.entries()) {
        if (playerData.user && playerData.user.id === winnerData.user.id) {
          winnerConnectionId = connId;
        }
        if (playerData.user && playerData.user.id === loserData.user.id) {
          loserConnectionId = connId;
        }
      }
      
      // Update winner's state (keep tournamentId for next round)
      if (winnerConnectionId && this.players.has(winnerConnectionId)) {
        this.players.set(winnerConnectionId, {
          ...winnerData,
          roomId: null,
          role: 'waiting',
          matchId: null
          // Keep tournamentId for next round
        });
      }
      
      // Update loser's state (remove from tournament)
      if (loserConnectionId && this.players.has(loserConnectionId)) {
        this.players.set(loserConnectionId, {
          ...loserData,
          roomId: null,
          role: 'waiting',
          tournamentId: null,
          matchId: null
        });
      }
      
      // If tournament is complete, notify winner
      if (tournamentResult.tournamentComplete && tournamentResult.tournamentWinner) {
        const championData = this.players.get(tournamentResult.tournamentWinner.toString());
        if (championData && championData.connection && championData.connection.readyState === 1) {
          championData.connection.send(JSON.stringify({
            type: 'tournamentChampion',
            username: championData.user.username
          }));
        }
      }
      
      // If tournament has next round, create next matches after a delay
      if (tournamentResult.nextRound && !tournamentResult.tournamentComplete) {
        console.log(`🎯 Tournament ${gameRoom.tournamentId} advancing to ${tournamentResult.nextRound}`);
        console.log(`📊 Tournament Result Status: ${tournamentResult.status}, Next Round: ${tournamentResult.nextRound}`);
        
        // Check if this round is complete (all matches done)
        if (tournamentResult.status === 'round_complete') {
          console.log(`🏆🏆🏆 ROUND COMPLETE! Broadcasting updated bracket to all players...`);
          
          // Get tournament and bracket data
          const tournament = this.tournamentManager.getTournament(gameRoom.tournamentId);
          if (tournament) {
            // Check if bracket has already been shown for this round
            const roundKey = `${tournament.status}_${tournamentResult.nextRound}`;
            if (tournament.bracketShownForRound && tournament.bracketShownForRound.has(roundKey)) {
              console.log(`⏭️ Bracket already shown for ${roundKey}, skipping duplicate broadcast`);
              return; // Exit early to prevent duplicate bracket + match creation
            }
            
            // Mark this round as having bracket shown
            if (!tournament.bracketShownForRound) {
              tournament.bracketShownForRound = new Set();
            }
            tournament.bracketShownForRound.add(roundKey);
            console.log(`✅ Marked bracket as shown for round: ${roundKey}`);
            
            const bracketData = this.tournamentManager.getBracketForFrontend(tournament);
            console.log(`📋 Bracket data:`, JSON.stringify(bracketData, null, 2));
            
            // Determine if this is the first bracket (after quarters) or subsequent
            const isFirstBracket = tournament.status === 'semi_finals' && tournamentResult.nextRound === 'semi_finals';
            console.log(`🔍 [BRACKET TIMING DEBUG]`);
            console.log(`   tournament.status: ${tournament.status}`);
            console.log(`   tournamentResult.nextRound: ${tournamentResult.nextRound}`);
            console.log(`   isFirstBracket: ${isFirstBracket}`);
            
            // Bracket delay needs to account for: bracket display time + time for players to transition
            // Match Ready screen is 4s, countdown is 3s, so we need bracket to show long enough
            // before the next match starts
            // NOTE: Using 4 seconds for intermediate brackets (after quarters and semis)
            const bracketDelay = 4000; // 4 seconds for all intermediate brackets
            
            console.log(`📊 Bracket timing: ${isFirstBracket ? 'FIRST' : 'SUBSEQUENT'} bracket, showing for ${bracketDelay/1000} seconds`);
            
            // Send updated bracket ONLY to WINNERS (players who advanced)
            let successfulBroadcasts = 0;
            let failedBroadcasts = 0;
            
            // Get list of players who advanced to next round
            const advancedPlayerIds = new Set();
            if (tournament.status === 'semi_finals') {
              // After quarters, semi-final players advanced
              tournament.bracket.semiFinals.forEach(match => {
                if (match.player1) advancedPlayerIds.add(match.player1.user.id);
                if (match.player2) advancedPlayerIds.add(match.player2.user.id);
              });
            } else if (tournament.status === 'finals') {
              // After semis, finalists advanced
              if (tournament.bracket.finals.player1) advancedPlayerIds.add(tournament.bracket.finals.player1.user.id);
              if (tournament.bracket.finals.player2) advancedPlayerIds.add(tournament.bracket.finals.player2.user.id);
            }
            
            for (const player of tournament.players) {
              // Only send to players who advanced
              if (!advancedPlayerIds.has(player.user.id)) {
                console.log(`⏭️ Skipping bracket for eliminated player ${player.user.username}`);
                continue;
              }
              
              if (player.connection && player.connection.readyState === 1) {
                try {
                  player.connection.send(JSON.stringify({
                    type: 'tournamentBracketUpdate',
                    bracket: bracketData,
                    roundComplete: true,
                    nextRound: tournamentResult.nextRound,
                    isFirstBracket: isFirstBracket
                  }));
                  successfulBroadcasts++;
                  console.log(`📤 Sent bracket update to ${player.user.username}`);
                } catch (err) {
                  failedBroadcasts++;
                  console.error(`❌ Failed to send bracket to ${player.user.username}:`, err);
                }
              } else {
                failedBroadcasts++;
                console.log(`⚠️ Cannot send bracket to ${player.user.username} - connection not ready (state: ${player.connection?.readyState || 'no connection'})`);
              }
            }
            console.log(`📊 Bracket broadcast: ${successfulBroadcasts} successful, ${failedBroadcasts} failed`);
            
            // Continue even if some broadcasts failed - remaining players need to proceed
            if (successfulBroadcasts === 0) {
              console.error(`❌ WARNING: No players received bracket update! Tournament may be stuck.`);
            }
            
            // Delay before starting next round matches (give players time to see bracket)
            console.log(`⏳ Waiting ${bracketDelay/1000} seconds before starting ${tournamentResult.nextRound}...`);
            setTimeout(() => {
              console.log(`🚀 Starting ${tournamentResult.nextRound} matches now!`);
              this.createTournamentMatches(this.tournamentManager.getTournament(gameRoom.tournamentId));
            }, bracketDelay);
          }
        } else {
          // Not all matches in round complete yet, just wait
          console.log(`⏳ Waiting for other matches in ${tournament.status} to complete...`);
          console.log(`📊 Current status: ${tournamentResult.status}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing tournament match:', error);
    }
  }

  // Process game completion and update player statistics
  async processGameCompletion(roomId, gameRoom, gameState) {
    try {
      console.log(`🎯 Processing completion for game ${roomId}`);
      
      // GLOBAL check - prevent ANY duplicate processing across all contexts
      if (this.processedGames.has(roomId)) {
        console.log(`⚠️ Game ${roomId} ALREADY IN GLOBAL PROCESSED SET, skipping duplicate processing`);
        return;
      }
      
      // Also check local flag
      if (gameRoom.gameProcessed) {
        console.log(`⚠️ Game ${roomId} already processed (local flag), skipping duplicate processing`);
        return;
      }
      
      // Check if this is a tournament match
      if (gameRoom.mode === 'tournament' && gameRoom.tournamentId && gameRoom.matchId) {
        return await this.processTournamentMatch(roomId, gameRoom, gameState);
      }
      
      // Ensure gameEndTime is set (safety check)
      if (!gameRoom.gameEndTime) {
        console.log(`⚠️ gameEndTime not set for room ${roomId}, setting it now`);
        gameRoom.gameEndTime = Date.now();
      }
      
      // Calculate game duration for logging
      // Priority: actualGameStartTime > gameStartTime > use a fallback (should never happen)
      let startTime = gameRoom.actualGameStartTime || gameRoom.gameStartTime;
      
      // If for some reason we don't have a start time, use a reasonable estimate
      // Assume game was created when room was made
      if (!startTime) {
        console.warn(`⚠️ No start time found for room ${roomId}, this should not happen!`);
        startTime = gameRoom.gameEndTime - 60000; // Assume 60 second game as fallback
      }
      
      const gameDuration = Math.floor((gameRoom.gameEndTime - startTime) / 1000);
      
      console.log(`🔍 Duration debug:`, {
        gameStartTime: gameRoom.gameStartTime,
        actualGameStartTime: gameRoom.actualGameStartTime,
        gameEndTime: gameRoom.gameEndTime,
        usingStartTime: startTime,
        rawDuration: gameRoom.gameEndTime - startTime,
        calculatedDuration: gameDuration,
        hasStartTime: !!startTime,
        hasEndTime: !!gameRoom.gameEndTime,
        willUseActual: !!gameRoom.actualGameStartTime,
        willUseFallback: !gameRoom.actualGameStartTime && !gameRoom.gameStartTime
      });
      
      const totalScore = gameState.player1.score + gameState.player2.score;
      
      console.log(`📊 Game ${roomId} stats: duration=${gameDuration}s, total_score=${totalScore}, winner=${gameState.winner}`);
      
      // Get players in this room
      const players = Array.from(gameRoom.players);
      console.log(`👥 Players in room: ${players.length}`);
      
      // Check if we have a disconnected player stored
      let allPlayersList = [];
      for (const playerId of players) {
        const playerData = this.players.get(playerId);
        if (playerData) allPlayersList.push(playerData);
      }
      
      // Add disconnected player if available
      if (gameRoom.disconnectedPlayer) {
        console.log(`📥 Found disconnected player: ${gameRoom.disconnectedPlayer.user.username} (role: ${gameRoom.disconnectedPlayer.role})`);
        allPlayersList.push(gameRoom.disconnectedPlayer);
      }
      
      console.log(`👥 Total players (including disconnected): ${allPlayersList.length}`);
      
      // Process stats even if only 1 player connected (disconnection = loss for disconnected player)
      if (allPlayersList.length === 0) {
        console.log(`⚠️ No players found for game ${roomId}, skipping`);
        return;
      }

      // Map players by role
      const player1Info = allPlayersList.find(p => p.role === 'player1');
      const player2Info = allPlayersList.find(p => p.role === 'player2');

      console.log(`👥 Player info by role: P1=${player1Info?.user?.username || 'null'} P2=${player2Info?.user?.username || 'null'}`);

      // We need at least one player
      if (!player1Info && !player2Info) {
        console.log(`⚠️ No valid player info for game ${roomId}`);
        return;
      }

      // Determine game mode
      let gameMode = 'matchmaking';
      if (gameRoom.gameState.gameMode === 'solo') {
        gameMode = 'solo';
      } else if (gameRoom.gameState.gameMode === 'ai') {
        gameMode = 'ai';
      }

      // Map players to actual roles - now simplified since we found them by role
      const actualPlayer1Info = player1Info;
      const actualPlayer2Info = player2Info;
      const actualPlayer1Score = gameState.player1.score;
      const actualPlayer2Score = gameState.player2.score;

      console.log(`🔍 Role mapping:`, {
        player1: actualPlayer1Info ? `${actualPlayer1Info.user?.username} (role: ${actualPlayer1Info.role})` : 'NULL',
        player2: actualPlayer2Info ? `${actualPlayer2Info.user?.username} (role: ${actualPlayer2Info.role})` : 'NULL',
        scores: `${actualPlayer1Score}-${actualPlayer2Score}`
      });

      const gameResult = {
        player1Id: actualPlayer1Info?.user?.id || null,
        player2Id: actualPlayer2Info?.user?.id || null,
        player1Score: actualPlayer1Score,
        player2Score: actualPlayer2Score,
        gameMode: gameMode,
        aiDifficulty: gameRoom.gameState.aiDifficulty,
        gameDuration: gameDuration,
        totalVolleys: gameState.totalVolleys || 0  // Add volleys count
      };

      console.log(`🎯 CRITICAL DEBUG - Game completion data:`, {
        roomId: roomId,
        gameEndTime: gameRoom.gameEndTime,
        actualGameStartTime: gameRoom.actualGameStartTime,
        gameStartTime: gameRoom.gameStartTime,
        calculatedDuration: gameDuration,
        gameState: {
          player1Score: gameState.player1.score,
          player2Score: gameState.player2.score,
          winner: gameState.winner,
          gameActive: gameState.gameActive
        },
        actualPlayer1: actualPlayer1Info ? `${actualPlayer1Info.user?.username} (ID: ${actualPlayer1Info.user?.id}) (role: ${actualPlayer1Info.role})` : 'NULL',
        actualPlayer2: actualPlayer2Info ? `${actualPlayer2Info.user?.username} (ID: ${actualPlayer2Info.user?.id}) (role: ${actualPlayer2Info.role})` : 'NULL',
        finalGameResult: {
          player1Id: gameResult.player1Id,
          player2Id: gameResult.player2Id,
          player1Score: gameResult.player1Score,
          player2Score: gameResult.player2Score,
          gameDuration: gameResult.gameDuration,
          whoWon: gameResult.player1Score > gameResult.player2Score ? 
            `Player1 (${actualPlayer1Info?.user?.username || 'disconnected'})` : 
            `Player2 (${actualPlayer2Info?.user?.username || 'disconnected'})`
        }
      });

      console.log(`🎯 Mapped players correctly:`, {
        actualPlayer1: actualPlayer1Info ? `${actualPlayer1Info.user?.username} (role: ${actualPlayer1Info.role})` : 'NULL',
        actualPlayer2: actualPlayer2Info ? `${actualPlayer2Info.user?.username} (role: ${actualPlayer2Info.role})` : 'NULL',
        scores: `${gameResult.player1Score}-${gameResult.player2Score}`,
        rawGameState: {
          player1Score: gameState.player1.score,
          player2Score: gameState.player2.score,
          winner: gameState.winner,
          gameActive: gameState.gameActive
        }
      });

      // Process stats ONLY for matchmaking mode (not solo/ai)
      if ((gameResult.player1Id || gameResult.player2Id) && gameMode === 'matchmaking') {
        console.log(`🏆 Processing stats for matchmaking game:`, gameResult);
        
        // Generate win screen data BEFORE applying stats (to show before/after comparison)
        const winScreenData = await this.winScreenData.generateWinScreenData(
          gameResult, 
          actualPlayer1Info, 
          actualPlayer2Info
        );
        
        console.log(`🎯 Win screen mapping:`, {
          player1Info: actualPlayer1Info?.user?.username || 'null',
          player2Info: actualPlayer2Info?.user?.username || 'null',
          player1Score: gameResult.player1Score,
          player2Score: gameResult.player2Score,
          player1Won: gameResult.player1Score > gameResult.player2Score,
          player2Won: gameResult.player2Score > gameResult.player1Score,
          winScreenPlayer1Result: winScreenData?.player1?.result,
          winScreenPlayer2Result: winScreenData?.player2?.result
        });
        
        await this.statsHandler.processGameCompletion(gameResult);
        
        // Mark as processed to prevent duplicate processing (both local and global)
        gameRoom.gameProcessed = true;
        this.processedGames.add(roomId);
        console.log(`✅ Game ${roomId} marked as processed in global set`);
        
        // Send win screen data to connected players
        if (winScreenData) {
          this.sendWinScreenData(actualPlayer1Info, actualPlayer2Info, winScreenData);
        }
        
        // Send updated stats to connected players
        await this.sendUpdatedStats(actualPlayer1Info, actualPlayer2Info, gameMode);
      } else if (gameMode === 'solo' || gameMode === 'ai') {
        console.log(`⚠️ Skipping stats update for ${gameMode} mode - practice mode only`);
        gameRoom.gameProcessed = true;
        this.processedGames.add(roomId);
      } else {
        console.log(`⚠️ Skipping stats update - missing player IDs`);
        gameRoom.gameProcessed = true;
        this.processedGames.add(roomId);
      }

    } catch (error) {
      console.error(`❌ Error processing game completion for ${roomId}:`, error);
      gameRoom.gameProcessed = true;
      this.processedGames.add(roomId); // Mark as processed even on error
    }
  }

  // Send win screen data to connected players
  sendWinScreenData(player1Info, player2Info, winScreenData) {
    try {
      if (player1Info?.connection && winScreenData.player1) {
        // Reset player's game_status back to 'online' after game ends
        if (player1Info.user?.id) {
          this.userAuth.setUserGameStatus(player1Info.user.id, 'online')
            .catch(err => console.error('Error resetting game_status for player1:', err));
        }
        
        player1Info.connection.send(JSON.stringify({
          type: 'gameResult',
          data: winScreenData.player1,
          matchData: winScreenData.matchData
        }));
        console.log(`🎉 Sent win screen data to ${winScreenData.player1.username}: ${winScreenData.player1.result}`);
      }

      if (player2Info?.connection && winScreenData.player2) {
        // Reset player's game_status back to 'online' after game ends
        if (player2Info.user?.id) {
          this.userAuth.setUserGameStatus(player2Info.user.id, 'online')
            .catch(err => console.error('Error resetting game_status for player2:', err));
        }
        
        player2Info.connection.send(JSON.stringify({
          type: 'gameResult',
          data: winScreenData.player2,
          matchData: winScreenData.matchData
        }));
        console.log(`🎉 Sent win screen data to ${winScreenData.player2.username}: ${winScreenData.player2.result}`);
      }
    } catch (error) {
      console.error('❌ Error sending win screen data:', error);
    }
  }

  // Send updated player statistics after game completion
  async sendUpdatedStats(player1Info, player2Info, gameMode) {
    try {
      if (player1Info?.user?.id && player1Info?.connection) {
        const p1Stats = await this.statsHandler.getPlayerProgression(player1Info.user.id);
        player1Info.connection.send(JSON.stringify({
          type: 'statsUpdated',
          stats: p1Stats
        }));
      }

      if (player2Info?.user?.id && player2Info?.connection && gameMode === 'matchmaking') {
        const p2Stats = await this.statsHandler.getPlayerProgression(player2Info.user.id);
        player2Info.connection.send(JSON.stringify({
          type: 'statsUpdated',
          stats: p2Stats
        }));
      }
    } catch (error) {
      console.error('❌ Error sending updated stats:', error);
    }
  }
}

module.exports = GameManager;