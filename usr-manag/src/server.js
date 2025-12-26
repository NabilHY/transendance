const fastify = require('fastify')({ logger: true });
const config = require('../config');
const notificationHandler = require('../routes/notificationHandler');
const { validateToken } = require('../utils/validateToken');
// Define allowed origins - support localhost, 127.0.0.1, and local network IPs

const allowedOrigins = config.FRONTEND_URL;

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
    if (!origin) return true; // Allow requests with no origin
    
    // Check if it matches configured origin
    if (allowedOrigins && allowedOrigins.includes(origin)) return true;
    
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
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    console.log(`[CORS] Origin: ${origin} - Allowed: ${isAllowed}`);
    return isAllowed;
};

console.log('allowedOrigins ::::::', allowedOrigins);

fastify.setErrorHandler(function (err, req, reply) {
    // Handle validation errors with custom messages
    if (err.validation) {
        const messages = err.validation.map(validationErr => {
            if (validationErr.keyword === 'required') {
                return `${validationErr.params.missingProperty} is required`;
            }
            return `${validationErr.instancePath} ${validationErr.message}`;
        });
        
        return reply.code(400).send({
            error: 'Validation failed',
            details: messages
        });
    }
    
    // Preserve the original status code if it exists, otherwise default to 500
    const statusCode = err.statusCode || 500;
    reply.code(statusCode).send({
        error: err.message || 'Internal server error'
    });
});

fastify.register(require('@fastify/cookie'));

// Register plugins
fastify.register(require('@fastify/websocket'));
fastify.register(require('@fastify/cors'), {
    origin: (origin, cb) => {
        const allowed = isOriginAllowed(origin);
        cb(null, allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    maxAge: 600,
});

fastify.register(require('../plugins/db'));
fastify.register(require('../plugins/auth'));
fastify.register(require('../plugins/minio'));
fastify.register(require('../plugins/swagger'));

// Health check
fastify.get('/health', {
    schema: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    service: { type: 'string' },
                    version: { type: 'string' },
                    timestamp: { type: 'string' }
                }
            }
        }
    }
}, async (request, reply) => {
    return {
        status: 'ok',
        service: config.SERVICE_NAME,
        version: config.SERVICE_VERSION,
        timestamp: new Date().toISOString()
    };
});

// Service discovery endpoint
fastify.get('/service-info', {
    schema: {
        tags: ['System'],
        summary: 'Service metadata',
        security: [],
        response: {
            200: {
                type: 'object',
                properties: {
                    service: { type: 'string' },
                    version: { type: 'string' },
                    endpoints: { type: 'array', items: { type: 'string' } },
                    dependencies: { type: 'array', items: { type: 'string' } }
                }
            }
        }
    }
}, async (request, reply) => {
    return {
        service: config.SERVICE_NAME,
        version: config.SERVICE_VERSION,
        endpoints: [
            'GET /health',
            'GET /service-info',
            'GET /users',
            'GET /me',
            'GET /users/:id',
            'PATCH /me/status',
            'PATCH /me/profile',
            'DELETE /me',
            'POST /users/:id/friend',
            'POST /users/:id/block',
            'GET /conversations/:id',
            'GET /chat/direct/:targetUserId',
            'POST /me/avatar',
            'GET /me/avatar',
            'GET /users/:id/avatar',
        ],
        dependencies: ['auth-backend']
    };
});

// Register routes
fastify.register(require('../routes/users'), { prefix: '' });
fastify.register(require('../routes/chat'), { prefix: '' });
fastify.register(require('../routes/friends'), { prefix: '' });
fastify.register(require('../routes/media'), { prefix: '' });
// fastify.register(require('../routes/profile'), { prefix: '' });
fastify.register(require('../routes/notifications'), { prefix: '' });
// fastify.register(require('../routes/profile'), { prefix: '' });
fastify.register(require('../plugins/metrics'), { prefix: '/metrics' });

// WebSocket endpoint for real-time notifications
fastify.register(async function (fastify) {
    fastify.get('/notifications/ws', { websocket: true }, (connection, req) => {
        // Manually authenticate because websocket handlers don't run preHandlers
        const rawCookie = req.headers?.cookie;
        const bearer = req.headers?.authorization;
        const token = req.cookies?.accessToken || bearer?.replace('Bearer ', '');

        const result = validateToken(token);
        if (!result.valid || !result.userId) {
            console.warn(`[WS] Unauthorized connection attempt. Cookie: ${rawCookie || 'none'}, Authorization: ${bearer || 'none'}`);
            connection?.socket?.close?.(1008, 'Unauthorized');
            return;
        }

        const userId = result.userId;
        const ws = connection?.socket || connection; // socket should be present; fallback for safety

        if (!ws || typeof ws.on !== 'function') {
            console.error('[WS] Socket missing on connection; cannot register events');
            return;
        }

        console.log(`[WS] User ${userId} connected. Cookie: ${rawCookie || 'none'}`);
        notificationHandler.registerNotificationConnection(userId, ws);
        
        ws.on('close', (code, reason) => {
            console.log(`[WS] Connection closed for user ${userId}. Code: ${code} Reason: ${reason?.toString?.() || ''}`);
            notificationHandler.unregisterNotificationConnection(userId, ws);
        });
        
        ws.on('error', (err) => {
            console.error(`WebSocket error for user ${userId}:`, err);
            notificationHandler.unregisterNotificationConnection(userId, ws);
        });
    });
});

const start = async () => {
    try {
        await fastify.listen({ port: `${config.USR_MANAG_PORT}`, host: '0.0.0.0' });
        fastify.log.info(`User Management Service listening on port ${config.USR_MANAG_PORT}`);
        fastify.log.info(`Auth Service URL: ${config.AUTH_BACKEND_URL}`);
        fastify.log.info(`API Documentation: http://localhost:${config.USR_MANAG_PORT}/docs`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();
