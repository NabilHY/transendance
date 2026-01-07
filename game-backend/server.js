const Fastify = require("fastify");
const fastifyWebsocket = require("@fastify/websocket");
const WebSocketHandler = require('./WebSocketHandler');

// Initialize Fastify server with CORS enabled
const fastify = Fastify({
  logger: false
});

// Manual CORS handling for all routes
fastify.addHook('preHandler', async (request, reply) => {
  // Get the origin from the request
  const origin = request.headers.origin;
  
  // Check if origin is allowed
  let isAllowed = false;
  if (origin) {
    // Allow localhost and 127.0.0.1 with any port
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^https?:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Local network IPs
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Local network IPs (HTTPS)
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,   // Private network IPs
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,   // Private network IPs (HTTPS)
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/,  // Private network IPs
      /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/,  // Private network IPs (HTTPS)
      /^https?:\/\/196\.119\.125\.6(:\d+)?$/,  // External public IP
      /^https?:\/\/[\d.]+:\d+$/  // Any IP address with port (development mode)
    ];

    // Allow explicit public origins from environment (e.g., ngrok/HTTPS entrypoint)
    const envOrigins = [process.env.NEXT_PUBLIC_BASE_URL, process.env.PUBLIC_URL]
      .filter(Boolean)
      .map(u => {
        try {
          // Escape dots in hostname and allow optional port
          const url = new URL(u);
          const protocol = url.protocol.replace(':', '');
          const hostRegex = url.hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`^${protocol}s?:\\/\\/${hostRegex}(:\\d+)?$`);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    if (envOrigins.length) {
      allowedPatterns.push(...envOrigins);
    }
    
    isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    console.log(`[CORS] Origin: ${origin} - Allowed: ${isAllowed}`);
  }
  
  // Set CORS headers - CRITICAL: When credentials are used, we MUST use specific origin, never '*'
  if (origin && isAllowed) {
    // For allowed origins with credentials, set specific origin (NEVER '*')
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Only use '*' when there's no origin (non-browser requests) and NO credentials
    reply.header('Access-Control-Allow-Origin', '*');
    // Explicitly do NOT set credentials when using '*'
  }
  // If origin is present but not allowed, don't set CORS headers (will be blocked by browser)
  
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return reply.status(200).send();
  }
});

fastify.register(fastifyWebsocket);

// Add health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Setup WebSocket handling
const wsHandler = new WebSocketHandler(fastify);
wsHandler.setupWebSocket();

// Add test endpoint for debugging stats
fastify.get('/test-stats/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    const statsHandler = wsHandler.gameManager.statsHandler;
    
    // Test getting user stats
    const currentStats = await statsHandler.getUserStats(parseInt(userId));
    
    // Test simulating a game result between user and another real user
    const otherUserId = parseInt(userId) === 1 ? 4 : 1; // Switch between bunda(1) and tester(4)
    const testGameResult = {
      player1Id: parseInt(userId),
      player2Id: otherUserId,
      player1Score: 10,
      player2Score: 5,
      gameMode: 'matchmaking',
      gameDuration: 120
    };
    
    await statsHandler.processGameCompletion(testGameResult);
    const updatedStats = await statsHandler.getUserStats(parseInt(userId));
    
    return {
      before: currentStats,
      testGame: testGameResult,
      after: updatedStats
    };
  } catch (error) {
    console.error('❌ Test stats error:', error);
    return { error: error.message };
  }
});

// Player stats API endpoint
fastify.get('/api/player-stats', async (request, reply) => {
  try {
    // Extract JWT token from (priority): Authorization header -> cookie -> query param
    const userAuth = wsHandler.userAuth;
    let token = null;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && request.headers && request.headers.cookie) {
      const cookies = userAuth.parseCookies(request.headers.cookie);
      token = cookies.accessToken || null;
    }
    if (!token) {
      const urlObj = new URL(request.url, 'http://localhost');
      token = urlObj.searchParams.get('token');
    }

    if (!token) {
      return reply.status(401).send({ error: 'No authentication token provided' });
    }

    // Verify JWT token to get user ID (use the same logic as websockets)
    const verifyResult = await userAuth.verifyToken(token);
    if (!verifyResult.success) {
      const err = verifyResult.error === 'TOKEN_EXPIRED' ? 'Token expired' : 'Invalid token';
      return reply.status(401).send({ error: err });
    }

    const decoded = verifyResult.user;
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Invalid token payload' });
    }
    
    // Get player statistics from database
    const statsHandler = wsHandler.gameManager.statsHandler;
    const stats = await statsHandler.getUserStats(parseInt(userId));
    
    if (!stats) {
      return reply.status(404).send({ error: 'Player stats not found' });
    }
    
    // Calculate additional derived stats
    const winRate = stats.games_played > 0 ? (stats.games_won / stats.games_played) * 100 : 0;
    
    const enhancedStats = {
      ...stats,
      win_rate: Math.round(winRate * 10) / 10, // Round to 1 decimal place
      games_lost: stats.games_played - stats.games_won,
    };
    
    return { 
      success: true,
      stats: enhancedStats 
    };
  } catch (error) {
    console.error('❌ Player stats API error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Match history API endpoint
fastify.get('/api/match-history/:userId', async (request, reply) => {
  try {
    const { userId } = request.params;
    const { limit = 50, offset = 0 } = request.query;

    const db = wsHandler.gameManager.userAuth.getDb();
    
    const query = `
      SELECT 
        mh.*,
        u1.username as player1_username,
        u2.username as player2_username,
        u3.username as player3_username,
        u4.username as player4_username,
        winner.username as winner_username
      FROM match_history mh
      LEFT JOIN users u1 ON mh.player1_id = u1.id
      LEFT JOIN users u2 ON mh.player2_id = u2.id
      LEFT JOIN users u3 ON mh.player3_id = u3.id
      LEFT JOIN users u4 ON mh.player4_id = u4.id
      LEFT JOIN users winner ON mh.winner_id = winner.id
      WHERE 
        mh.player1_id = ? OR 
        mh.player2_id = ? OR 
        mh.player3_id = ? OR 
        mh.player4_id = ?
      ORDER BY mh.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const matches = await new Promise((resolve, reject) => {
      db.all(
        query,
        [userId, userId, userId, userId, parseInt(limit), parseInt(offset)],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM match_history
      WHERE 
        player1_id = ? OR 
        player2_id = ? OR 
        player3_id = ? OR 
        player4_id = ?
    `;

    const totalCount = await new Promise((resolve, reject) => {
      db.get(countQuery, [userId, userId, userId, userId], (err, row) => {
        if (err) return reject(err);
        resolve(row?.total || 0);
      });
    });

    return {
      success: true,
      matches: matches,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    };
  } catch (error) {
    console.error('❌ Match history API error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Game update loop already started inside WebSocketHandler constructor

const port = process.env.GAME_BACKEND_PORT || 4322;
fastify.listen({ port: parseInt(port), host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});