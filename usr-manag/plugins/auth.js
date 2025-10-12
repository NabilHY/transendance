const fp = require('fastify-plugin');
const { validateToken } = require('../utils/validateToken');

async function authPlugin(fastify) {
    fastify.decorate('authenticate', function (request, reply) {
            const token = request.cookies?.accessToken || 
                         request.headers?.authorization?.replace('Bearer ', '');
            
            const result = validateToken(token);

            if (!result.valid) {
                return reply.code(401).send({ error: result.error });
            }

            request.user = {
                id: result.userId,
                type: result.type,
            }
    });
    
    console.log('Auth plugin: authenticate function decorated');
}

module.exports = fp(authPlugin);
