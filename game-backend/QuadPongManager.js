const QuadPongState = require('./QuadPongState');
const GameStatsHandler = require('./GameStatsHandler');
const WinScreenData = require('./WinScreenData');

class QuadPongManager {
  constructor(userAuth) {
    // Store all quad pong game rooms
    this.quadGames = new Map(); // roomId -> { gameState, gameLoop, players: Set(), teams: {} }
    this.quadPlayers = new Map(); // connectionId -> { roomId, role, team, connection, user }
    this.quadWaitingQueue = []; // Players waiting to be matched (need 4 players)
    this.nextGameId = 1;
    
    // Initialize stats handler (reuse existing one)
    this.userAuth = userAuth;
    this.statsHandler = new GameStatsHandler(userAuth);
    this.winScreenData = new WinScreenData(this.statsHandler, this.statsHandler.progression);
  }

  // Generate unique connection ID
  generateConnectionId() {
    return `quad_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique room ID
  generateRoomId() {
    return `quad_room_${this.nextGameId++}`;
  }

  // Find connection ID by socket reference
  findConnectionIdBySocket(socket) {
    for (const [connectionId, playerData] of this.quadPlayers.entries()) {
      if (playerData.connection === socket) {
        return connectionId;
      }
    }
    return null;
  }

  // Add authenticated player to quad matchmaking queue
  async addToQuadMatchmaking(connection, user) {
    console.log(`🎯 [QUAD] Adding ${user.username} to quad matchmaking queue`);
    console.log(`📊 [QUAD] Current queue length: ${this.quadWaitingQueue.length}/4`);
    
    // Check if user is already in queue
    const existingPlayer = this.findPlayerByUserId(user.id);
    if (existingPlayer) {
      console.log(`⚠️  [QUAD] User ${user.username} already in queue, removing old connection`);
      await this.removePlayer(existingPlayer.connectionId);
    }

    const connectionId = this.generateConnectionId();
    
    // Add to queue
    this.quadWaitingQueue.push({ connection, connectionId, user });
    
    this.quadPlayers.set(connectionId, {
      roomId: null,
      role: 'waiting',
      team: null,
      connection,
      user
    });

    console.log(`✅ [QUAD] User ${user.username} added to queue (${this.quadWaitingQueue.length}/4)`);
    
    // Check if we have 4 players
    if (this.quadWaitingQueue.length >= 4) {
      console.log(`🎮 [QUAD] 4 players found! Creating quad pong match...`);
      return await this.createQuadPongMatch();
    }
    
    return {
      connectionId,
      roomId: null,
      role: 'waiting',
      gameType: 'quad',
      queuePosition: this.quadWaitingQueue.length,
      totalWaiting: this.quadWaitingQueue.length,
      gameState: null
    };
  }

  // Find player by user ID
  findPlayerByUserId(userId) {
    for (const [connectionId, playerData] of this.quadPlayers.entries()) {
      if (playerData.user && playerData.user.id === userId) {
        return { connectionId, ...playerData };
      }
    }
    return null;
  }

  // Create a 4-player quad pong match
  async createQuadPongMatch() {
    const roomId = this.generateRoomId();
    
    // Get 4 players from queue
    const players = [
      this.quadWaitingQueue.shift(),
      this.quadWaitingQueue.shift(),
      this.quadWaitingQueue.shift(),
      this.quadWaitingQueue.shift()
    ];

    console.log(`👥 [QUAD] Creating match with players: ${players.map(p => p.user.username).join(', ')}`);

    // Assign teams and roles
    // Team 1 (Left): players[0] (top), players[1] (bottom)
    // Team 2 (Right): players[2] (top), players[3] (bottom)
    const playerAssignments = [
      { player: players[0], team: 'team1', role: 'team1Player1' }, // Left top
      { player: players[1], team: 'team1', role: 'team1Player2' }, // Left bottom
      { player: players[2], team: 'team2', role: 'team2Player1' }, // Right top
      { player: players[3], team: 'team2', role: 'team2Player2' }  // Right bottom
    ];

    // Create game state
    const gameState = new QuadPongState();
    
    // Fetch stats BEFORE game starts for ALL players
    const statsBeforeMap = new Map();
    for (const player of players) {
      try {
        const statsBefore = await this.statsHandler.getUserStats(player.user.id);
        statsBeforeMap.set(player.user.id, statsBefore);
        console.log(`📊 [QUAD] Stats BEFORE game start for ${player.user.username}: RR=${statsBefore.rank_points}, XP=${statsBefore.experience_points}`);
      } catch (err) {
        console.error(`❌ [QUAD] Failed to get stats for user ${player.user.id}:`, err);
      }
    }

    // Create game room
    const game = {
      mode: 'quad',
      players: new Set(players.map(p => p.connectionId)),
      gameState,
      gameLoop: null, // Will be set up later
      createdAt: Date.now(),
      gameStartTime: Date.now(),
      wasActive: false,
      gameProcessed: false,
      authenticatedPlayers: new Map(players.map(p => [p.connectionId, p.user])),
      teams: {
        team1: [players[0].user.id, players[1].user.id],
        team2: [players[2].user.id, players[3].user.id]
      },
      playerRoles: new Map(playerAssignments.map(pa => [pa.player.connectionId, pa.role])),
      statsBeforeMap: statsBeforeMap // Store initial stats for all players
    };

    this.quadGames.set(roomId, game);

    // Update all players
    const results = playerAssignments.map(({ player, team, role }) => {
      this.quadPlayers.set(player.connectionId, {
        roomId,
        role,
        team,
        connection: player.connection,
        user: player.user
      });

      // Find teammates
      const teammates = playerAssignments
        .filter(pa => pa.team === team && pa.player.connectionId !== player.connectionId)
        .map(pa => pa.player.user);

      const opponents = playerAssignments
        .filter(pa => pa.team !== team)
        .map(pa => pa.player.user);

      return {
        connectionId: player.connectionId,
        connection: player.connection,
        roomId,
        role,
        team,
        user: player.user,
        teammates,
        opponents,
        gameType: 'quad',
        gameState: gameState.getState()
      };
    });

    // Start the game
    this.startQuadGame(roomId);

    console.log(`✅ [QUAD] Match created: ${roomId}`);
    console.log(`   Team 1: ${players[0].user.username} & ${players[1].user.username}`);
    console.log(`   Team 2: ${players[2].user.username} & ${players[3].user.username}`);

    return results;
  }

  // Start the quad game and begin game loop
  startQuadGame(roomId) {
    const gameRoom = this.quadGames.get(roomId);
    if (!gameRoom) return;

    const { gameState } = gameRoom;

    // Start the game
    gameState.start();

    // Create game loop
    const gameInterval = setInterval(() => {
      gameState.update();
      
      const state = gameState.getState();
      
      // Check for winner
      if (state.winner) {
        console.log(`🏆 [QUAD] ${state.winner} wins! Final Score: ${state.team1Score} - ${state.team2Score}`);
        
        // Store final scores
        gameRoom.finalScores = {
          team1Score: state.team1Score,
          team2Score: state.team2Score
        };
        gameRoom.gameEndTime = Date.now();
        gameRoom.wasActive = true;
        
        // Stop game loop
        console.log(`⏹️  [QUAD] Stopping game loop for room ${roomId}`);
        clearInterval(gameInterval);
        gameRoom.gameInterval = null;
        
        // Process game completion
        console.log(`📊 [QUAD] Starting processQuadGameCompletion for room ${roomId}`);
        this.processQuadGameCompletion(roomId, gameRoom, state).catch(err => {
          console.error(`❌ [QUAD] Error processing game completion:`, err);
          console.error(err.stack);
        });
      }
      
      // Broadcast game state to all players
      this.broadcastQuadGameState(roomId, state);
    }, 1000 / 60); // 60 FPS

    gameRoom.gameInterval = gameInterval;
  }

  // Broadcast game state to all players in a quad match
  broadcastQuadGameState(roomId, state) {
    const gameRoom = this.quadGames.get(roomId);
    if (!gameRoom) return;

    const stateJSON = JSON.stringify(state);
    
    for (const connectionId of gameRoom.players) {
      const playerData = this.quadPlayers.get(connectionId);
      if (playerData && playerData.connection && playerData.connection.readyState === 1) {
        playerData.connection.send(stateJSON);
      }
    }
  }

  // Handle player movement update
  handlePlayerUpdate(connectionId, movementData) {
    const player = this.quadPlayers.get(connectionId);
    if (!player || !player.roomId) {
      console.log(`⚠️ [QUAD] handlePlayerUpdate - player not found or no roomId: connectionId=${connectionId}`);
      return;
    }

    const gameRoom = this.quadGames.get(player.roomId);
    if (!gameRoom) {
      console.log(`⚠️ [QUAD] handlePlayerUpdate - gameRoom not found: roomId=${player.roomId}`);
      return;
    }

    const { gameState } = gameRoom;
    const role = player.role;

    console.log(`🎮 [QUAD] Player update: ${player.user.username} (${role}) dy=${movementData.dy}`);

    // Convert movement data based on player role
    const updates = {};
    
    if (role === 'team1Player1') {
      updates.team1Player1DY = movementData.dy;
    } else if (role === 'team1Player2') {
      updates.team1Player2DY = movementData.dy;
    } else if (role === 'team2Player1') {
      updates.team2Player1DY = movementData.dy;
    } else if (role === 'team2Player2') {
      updates.team2Player2DY = movementData.dy;
    }

    gameState.updatePlayerMovement(updates);
  }

  // Process quad game completion (stats, win screens)
  async processQuadGameCompletion(roomId, gameRoom, gameState) {
    if (gameRoom.gameProcessed) {
      console.log(`⚠️  [QUAD] Game ${roomId} already processed, skipping`);
      return;
    }

    gameRoom.gameProcessed = true;

    const scores = {
      team1: gameRoom.finalScores?.team1Score || gameState.team1Score || 0,
      team2: gameRoom.finalScores?.team2Score || gameState.team2Score || 0
    };

    console.log(`🏆 [QUAD] Processing completion for ${roomId}: Team1=${scores.team1}, Team2=${scores.team2}`);

    const team1Won = scores.team1 > scores.team2;
    const winningTeam = team1Won ? 'team1' : 'team2';
    const losingTeam = team1Won ? 'team2' : 'team1';

    // Get ALL players (including disconnected ones) from the original team rosters
    const team1UserIds = gameRoom.teams.team1;
    const team2UserIds = gameRoom.teams.team2;

    console.log(`📋 [QUAD] Team 1 IDs: ${team1UserIds.join(', ')}`);
    console.log(`📋 [QUAD] Team 2 IDs: ${team2UserIds.join(', ')}`);

    // Use the stats captured at game start (from gameRoom.statsBeforeMap)
    const statsBeforeMap = gameRoom.statsBeforeMap || new Map();
    console.log(`📊 [QUAD] Using stats captured at game start for ${statsBeforeMap.size} players`);

    // Process stats for ALL team 1 players (winners or losers)
    for (const userId of team1UserIds) {
      try {
        const currentStats = statsBeforeMap.get(userId);
        if (currentStats) {
          await this.statsHandler.updatePlayerStats(
            userId,
            currentStats,
            team1Won,
            'quad'
          );
          console.log(`✅ [QUAD] Updated stats for team1 user ${userId} (won: ${team1Won})`);
        }
      } catch (err) {
        console.error(`❌ [QUAD] Failed to update stats for team1 user ${userId}:`, err);
      }
    }

    // Process stats for ALL team 2 players (winners or losers)
    for (const userId of team2UserIds) {
      try {
        const currentStats = statsBeforeMap.get(userId);
        if (currentStats) {
          await this.statsHandler.updatePlayerStats(
            userId,
            currentStats,
            !team1Won,
            'quad'
          );
          console.log(`✅ [QUAD] Updated stats for team2 user ${userId} (won: ${!team1Won})`);
        }
      } catch (err) {
        console.error(`❌ [QUAD] Failed to update stats for team2 user ${userId}:`, err);
      }
    }

    // Log game to history (one entry for the whole match)
    const gameDuration = Math.floor((gameRoom.gameEndTime - gameRoom.gameStartTime) / 1000);
    await this.statsHandler.logGameHistory({
      player1Id: team1UserIds[0],
      player2Id: team2UserIds[0],
      player1Score: scores.team1,
      player2Score: scores.team2,
      gameMode: 'quad',
      gameDuration,
      winner: team1Won ? team1UserIds[0] : team2UserIds[0]
    });

    console.log(`✅ [QUAD] Stats updated for all players`);

    // Send win screens to all players
    await this.sendQuadWinScreens(gameRoom, team1Won, statsBeforeMap, scores);
  }

  // Send win screens to all quad players (only connected ones)
  async sendQuadWinScreens(gameRoom, team1Won, statsBeforeMap, scores) {
    // Get all user info from authenticated players map
    const allPlayers = Array.from(gameRoom.authenticatedPlayers.entries()).map(([connId, user]) => {
      // Find if this player is still connected
      const playerData = this.quadPlayers.get(connId);
      const team = gameRoom.teams.team1.includes(user.id) ? 'team1' : 'team2';
      
      return {
        connectionId: connId,
        user: user,
        team: team,
        connected: playerData && playerData.connection && playerData.connection.readyState === 1,
        connection: playerData?.connection
      };
    });

    // Send win screens only to connected players
    for (const player of allPlayers) {
      if (!player.connected) {
        console.log(`⚠️  [QUAD] Skipping win screen for disconnected player: ${player.user.username}`);
        continue;
      }

      const won = (player.team === 'team1' && team1Won) || (player.team === 'team2' && !team1Won);
      
      // Get teammates and opponents
      const teammates = allPlayers.filter(p => p.team === player.team && p.user.id !== player.user.id);
      const opponents = allPlayers.filter(p => p.team !== player.team);

      // Get stats before and after
      const statsBefore = statsBeforeMap.get(player.user.id);
      const statsAfter = await this.statsHandler.getUserStats(player.user.id);

      console.log(`📊 [QUAD] Stats AFTER for ${player.user.username}: RR=${statsAfter.rank_points}, XP=${statsAfter.experience_points}`);
      console.log(`📊 [QUAD] Stats DIFF for ${player.user.username}: RR=${(statsAfter.rank_points||0)-(statsBefore.rank_points||0)}, XP=${(statsAfter.experience_points||0)-(statsBefore.experience_points||0)}`);

      console.log(`📤 [QUAD] Sending quadGameResult to ${player.user.username}: won=${won}, team=${player.team}`);
      player.connection.send(JSON.stringify({
        type: 'quadGameResult',
        won,
        team: player.team,
        teammates: teammates.map(t => ({
          username: t.user.username,
          id: t.user.id
        })),
        opponents: opponents.map(o => ({
          username: o.user.username,
          id: o.user.id
        })),
        finalScore: {
          team1: scores.team1,
          team2: scores.team2
        },
        stats: (statsBefore && statsAfter) ? {
          oldRating: statsBefore.rank_points || 0,
          newRating: statsAfter.rank_points || 0,
          oldXp: statsBefore.experience_points || 0,
          newXp: statsAfter.experience_points || 0,
          oldLevel: statsBefore.player_level || 1,
          newLevel: statsAfter.player_level || 1,
          totalMatches: statsAfter.games_played || 0,
          wins: statsAfter.games_won || 0,
          losses: statsAfter.games_lost || 0
        } : null
      }));
      
      console.log(`📤 [QUAD] Sent win screen to ${player.user.username} (won: ${won})`);
    }
  }

  // Remove player (disconnect handler)
  async removePlayer(connectionId) {
    const player = this.quadPlayers.get(connectionId);
    if (!player) return;

    console.log(`🔌 [QUAD] User ${player.user?.username || connectionId} disconnected`);

    // Remove from waiting queue if waiting
    if (player.role === 'waiting') {
      this.quadWaitingQueue = this.quadWaitingQueue.filter(p => p.connectionId !== connectionId);
      console.log(`🚫 [QUAD] Removed from queue (${this.quadWaitingQueue.length}/4 remaining)`);
    }

    // Handle in-game disconnection
    if (player.roomId) {
      const gameRoom = this.quadGames.get(player.roomId);
      if (gameRoom) {
        const disconnectedTeam = player.team;
        gameRoom.players.delete(connectionId);
        
        // Count remaining players per team
        let team1Count = 0;
        let team2Count = 0;
        
        for (const remainingId of gameRoom.players) {
          const remainingPlayer = this.quadPlayers.get(remainingId);
          if (remainingPlayer) {
            if (remainingPlayer.team === 'team1') team1Count++;
            if (remainingPlayer.team === 'team2') team2Count++;
          }
        }
        
        console.log(`⚠️  [QUAD] Player from ${disconnectedTeam} disconnected. Remaining: Team1=${team1Count}, Team2=${team2Count}`);
        
        // Only end game if a team has NO players left
        if (team1Count === 0 || team2Count === 0) {
          console.log(`🏆 [QUAD] A team has no players left - ending game`);
          
          // Stop game loop
          if (gameRoom.gameInterval) {
            clearInterval(gameRoom.gameInterval);
            gameRoom.gameInterval = null;
          }
          
          // Determine winning team
          const winningTeam = team1Count > 0 ? 'team1' : 'team2';
          
          // Award win to remaining team and process stats
          if (gameRoom.players.size > 0) {
            console.log(`🎉 [QUAD] Awarding win to ${winningTeam} due to opponent team disconnect`);
            
            // Set final score - winning team gets 5
            const state = gameRoom.gameState.getState();
            if (winningTeam === 'team1') {
              state.team1Score = 5;
            } else {
              state.team2Score = 5;
            }
            state.winner = winningTeam;
            state.gameActive = false;
            gameRoom.gameEndTime = Date.now();
            
            // Process game completion with stats
            await this.processQuadGameCompletion(player.roomId, gameRoom, state);
          }
        } else {
          // Both teams still have players
          const state = gameRoom.gameState.getState();
          
          // Only notify if game is still active (not ended)
          if (state.gameActive && !state.winner) {
            console.log(`✅ [QUAD] Game continues with remaining players`);
            
            // Notify remaining players about the disconnection
            for (const remainingId of gameRoom.players) {
              const remainingPlayer = this.quadPlayers.get(remainingId);
              if (remainingPlayer && remainingPlayer.connection && remainingPlayer.connection.readyState === 1) {
                remainingPlayer.connection.send(JSON.stringify({
                  type: 'playerLeft',
                  message: `A player from ${disconnectedTeam} left. Game continues.`,
                  team: disconnectedTeam
                }));
              }
            }
          } else {
            console.log(`🏁 [QUAD] Game already ended - no notification sent for disconnect`);
          }
        }

        // Clean up empty game
        if (gameRoom.players.size === 0) {
          this.quadGames.delete(player.roomId);
          console.log(`🧹 [QUAD] Removed empty game room ${player.roomId}`);
        }
      }
    }

    this.quadPlayers.delete(connectionId);
  }

  // Get stats
  getStats() {
    return {
      totalQuadGames: this.quadGames.size,
      totalQuadPlayers: this.quadPlayers.size,
      quadWaitingPlayers: this.quadWaitingQueue.length
    };
  }
}

module.exports = QuadPongManager;
