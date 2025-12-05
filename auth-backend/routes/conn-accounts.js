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
        const userId = req.user.sub;
        
        if (!userId) {
            return reply.code(401).send({
                error: 'Unauthorized'
            });
        }
        
        const accounts = fastify.connectedAccounts.getConnectedAccounts(userId);
        
        if (!accounts) {
            return reply.code(404).send({
                error: 'No connected accounts found'
            });
        }
        
        return reply.code(200).send({
            accounts: accounts
        });
    }
)};

module.exports = connAccountsRoutes;