const config = require('../config');

module.exports = async function (fastify) {
    fastify.post('/verify-token', async (req, reply) => {
        // Service key validation
        
        
        // Input Validation
        // Error handling
        
        // Security response
        
        try {
            const { token, serviceKey } = req.body || {};
            
            if (!token || !serviceKey) {
                return reply.code(400).send({
                    valid: false,
                    error: 'Token and service key are required'
                });
            }

            // verify service key
            if (serviceKey !== config.INTEENAL_SERVICE_KEY) {
                fastify.log.warn('Invalid service key');
                return reply.code(403).send({
                    valid: false,
                    error: 'Unauthorized service'
                });
            }
            
            
            const decoded = fastify.jwt.verify(token);
            
            // only accept access tokens
            if (decoded.type && decoded.type !== 'access') {
                return reply.code(401).send({ 
                    valid: false, 
                    error: 'Invalid token type' 
                });
            }
            
            return reply.code(200).send({
                valid: true,
                userId: decoded.sub,
                type: decoded.type,
            })

        } catch (err) {
            fastify.log.error('Error verifying token:', err);
            return reply.code(500).send({
                valid: false,
                error: 'Internal server error'
            });
        }

    });
}