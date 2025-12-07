async function connAccountsRoutes(fastify) {
    // GET connected accounts
    fastify.get('/connected-accounts', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Get connected accounts for the current user',
            tags: ['OAuth'],
            summary: 'Get Connected Accounts',
            security: [{ Bearer: [], CSRF: [] }]
        }
    }, async (req, reply) => {
        try {
            const userId = req.user.sub;
            
            if (!userId) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            
            const accounts = await fastify.connectedAccounts.getConnectedAccounts(userId);
            
            if (!accounts) {
                return reply.code(404).send({ error: 'User not found' });
            }
            
            return reply.code(200).send({ accounts: accounts || [] });
        } catch (error) {
            fastify.log.error('Error fetching connected accounts:', error);
            return reply.code(500).send({
                error: 'Internal server error',
                message: 'Failed to fetch connected accounts'
            });
        }
    });

    // DELETE unlink account
    fastify.delete('/connected-accounts/:provider', {
        preHandler: [fastify.authenticate],
        schema: {
            description: 'Unlink an authentication provider from the current user',
            tags: ['OAuth'],
            summary: 'Unlink Authentication Provider',
            security: [{ Bearer: [], CSRF: [] }],
            params: {
                type: 'object',
                required: ['provider'],
                properties: {
                    provider: {
                        type: 'string',
                        enum: ['google'],
                        description: 'Authentication provider to unlink'
                    }
                }
            },
            response: {
                200: {
                    description: 'Provider unlinked successfully',
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    },
                    required: ['message']
                },
                400: {
                    description: 'Invalid provider or account not connected',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    },
                    required: ['error']
                },
                401: {
                    description: 'Unauthorized',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    },
                    required: ['error']
                },
                403: {
                    description: 'Cannot unlink - no password set',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    },
                    required: ['error']
                },
                500: {
                    description: 'Internal server error',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    },
                    required: ['error']
                }
            }
        }
    }, async (req, reply) => {
        try {
            const userId = req.user.sub;
            const { provider } = req.params;
            
            
            // Check authentication first
            if (!userId) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            
            // Validate provider
            if (!provider || !['google'].includes(provider)) {
                return reply.code(400).send({
                    error: 'Invalid provider. Supported providers: google'
                });
            }
            
            // Check if account is actually connected
            const accounts = await fastify.connectedAccounts.getConnectedAccounts(userId);
            const isConnected = accounts && accounts.some(acc => acc.provider === provider);
            
            
            if (!isConnected) {
                return reply.code(400).send({
                    error: `Account is not connected to ${provider}`
                });
            }
            
            // Security check: Ensure user has password before unlinking
            const user = await new Promise((resolve, reject) => {
                fastify.db.get(
                    'SELECT password_hash FROM users WHERE id = ?',
                    [userId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }
            
            if (!user.password_hash) {
                return reply.code(403).send({
                    error: 'Cannot unlink account. Please set a password first to prevent account lockout.'
                });
            }

            
            // Disconnect the account
            //! **** !//
            const result = await fastify.connectedAccounts.disconnectAccount(userId, provider);
            if (!result.success) {
                return reply.code(400).send({
                    error: result.error || 'Failed to disconnect account'
                });
            }
            
            const verify = await fastify.connectedAccounts.getConnectedAccounts(userId);
            const stillConnected = verify && verify.some(acc => acc.provider === provider);
            if (stillConnected) {
                fastify.log.error({ userId, provider }, 'Disconnect verification failed');
                return reply.code(500).send({
                    error: 'Failed to verify account disconnect'
                });
            }
            
            fastify.log.info(`Authentication provider ${provider} unlinked for user ${userId}`);
            
            return reply.code(200).send({
                message: `Authentication provider ${provider} unlinked successfully`
            });
        } catch (error) {
            fastify.log.error('Error unlinking authentication provider:', error);
            return reply.code(500).send({
                error: 'Internal server error',
                message: 'Failed to unlink authentication provider'
            });
        }
    });
}

module.exports = connAccountsRoutes;