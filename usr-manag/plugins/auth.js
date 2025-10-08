const fp = require('fastify-plugin');
const axios = require('axios');

async function authPlugin(fastify) {
    const config = require('../config');
    
    // JWT verification by calling auth service
    fastify.decorate('authenticate', async function (request, reply) {
        try {
            const token = request.cookies?.accessToken || 
                         request.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return reply.code(401).send({ error: 'No token provided' });
            }

            // Verify token with auth service
            const response = await axios.get(`${config.AUTH_SERVICE_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `accessToken=${token}`
                },
                timeout: 5000
            });

            if (response.status !== 200) {
                return reply.code(401).send({ error: 'Invalid token' });
            }

            // Set user info for handlers
            request.user = { id: response.data.userId };
            return;
        } catch (error) {
            fastify.log.error('Authentication error:', error.message);
            return reply.code(401).send({ error: 'Authentication failed' });
        }
    });
    
    console.log('Auth plugin: authenticate function decorated');
}

module.exports = fp(authPlugin);
