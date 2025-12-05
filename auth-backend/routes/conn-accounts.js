async function connAccountsRoutes(fastify) {
    fastify.get('/connected-accounts', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get connected accounts for the current user',
            tags: ['OAuth'],
            summary: 'Get Connected Accounts',
            security: [
                {
                    Bearer: [],
                    CSRF: []
                }
            ]
        }
    }, async (req, reply) => {
        try {
            const userId = req.user.sub;
            
            if (!userId) {
                return reply.code(401).send({
                    error: 'Unauthorized'
                });
            }
            
            const accounts = await fastify.connectedAccounts.getConnectedAccounts(userId);  // ← Added await here
            
            if (!accounts) {
                return reply.code(404).send({
                    error: 'User not found'
                });
            }
            
            // Return empty array if no accounts, not null
            return reply.code(200).send({
                accounts: accounts || []
            });
        } catch (error) {
            fastify.log.error('Error fetching connected accounts:', error);
            return reply.code(500).send({
                error: 'Internal server error',
                message: 'Failed to fetch connected accounts'
            });
        }
    }
)};

module.exports = connAccountsRoutes;