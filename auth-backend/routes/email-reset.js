const fastify = require('fastify');

module.exports = function async (fastify) {
    fastify.patch('email-reset', {
        schema: {
            description: 'Reset email for a user',
        }
    }, async (req, rep) => {
        
    });
};