module.exports = async function (fastify) {
    fastify.patch('/email-reset', {
        schema: {
            description: 'Reset email for a user - sends verification email to new address',
            tags: ['Authentication'],
            summary: 'Reset email',
            security: [{ Bearer: [] }],
            body: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string', format: 'email' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [fastify.authenticate]
    }, async (req, reply) => {
        try {
            const { email } = req.body || {};
            
            if (!email) {
                return reply.code(400).send({ error: 'Email is required' });
            }
            
            const userId = fastify.accountSecurity.getUserId(req);            
            
            const user = await fastify.accountSecurity.getUserData(userId);
            
            const dbEmail = user.email;
            
            if (dbEmail === email) {
                return reply.code(400).send({ error: 'New email cannot be the same as the current email' });
            }
            
            await fastify.accountSecurity.resetEmailValidation(userId, email);
            
            return reply.code(200).send({
                message: 'Verification email sent to new address'
            });
        } catch (error) {
            if (error.message === 'Invalid email address') {
                return reply.code(400).send({ error: error.message });
            }
            if (error.message === 'Email already in use') {
                return reply.code(409).send({ error: error.message });
            }
            fastify.log.error({
                err: error, 
                message: error.message, 
                stack: error.stack,
                name: error.name,
                code: error.code,
                email: email
            }, 'Email reset error');
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    fastify.post('/email-reset/confirm', {
        schema: {
            description: 'Confirm email reset via token in request body',
            tags: ['Authentication'],
            summary: 'Confirm email reset',
            body: {
                type: 'object',
                required: ['token'],
            }
        },
        preHandler: [fastify.authenticate]
    }, async (req, rep) => {
        const { token } = req.body || {};
        if (!token) return rep.code(400).send({ error: 'No Token Provided' }); 

        const tokenRecord = await new Promise((res, rej) => {
            fastify.db.get('SELECT user_id, expires_at, new_email FROM email_verification_tokens WHERE token = ?', [token], (err, row) => {
                if (err) rej(err);
                else res(row);
            });
        });

        if (!tokenRecord) {
            return rep.code(400).send({ error: 'Invalid or expired token' });
        }

        if (tokenRecord.expires_at < Math.floor(Date.now() / 1000)) {
            return rep.code(400).send({ error: 'Invalid or expired token' });
        }

        const user = await new Promise((res, rej) => {
            fastify.db.get('SELECT id FROM users WHERE id = ?', [tokenRecord.user_id], (err, row) => {
                if (err) rej(err);
                else res(row);
            });
        });

        if (!user) {
            return rep.code(404).send({ error: 'User not found' });
        }
        
        await fastify.accountSecurity.deleteAllTokens(user.id);

        await fastify.accountSecurity.resetEmail(user.id, tokenRecord.new_email);
        
        return rep.code(200).send({ message: 'Email reset successfully' });
    });

}