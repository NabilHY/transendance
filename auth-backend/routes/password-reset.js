const { verifyPassword, hashPassword } = require('../utils/hash')
const { validatePassword } = require('../utils/passwordPolicy');

module.exports = async function (fastify) {
    fastify.patch('/reset-password', {
        schema: {
            description: 'Reset Passowrd',
            tags: ['Authentication'],
            summary: 'Change Password',
            security: [{ Bearer: [] }],
            body: {
                type: 'object',
                required: ['oldPassword'],
                properties: {
                    oldPassword: { type: 'string' },
                    newPassword: { type: 'string' }
                },
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
        }, preHandler: [fastify.authenticate]
    }, async (req, rep) => {
        try {
            
            const userId = fastify.accountSecurity.getUserId(req);
            
            console.log("userId", userId);
            
            
            const user = await fastify.accountSecurity.getUserData(userId);
            console.log("email", user.email);
        
            const { oldPassword, newPassword } = req.body || {};
            
            if (!oldPassword || !userId || !newPassword) {
                return rep.code(400).send({ error: 'Old password, user ID, and new password are required' });
            }
            
            if (!user) {
                return rep.code(404).send({ error: 'User not found' });
            }
            
            const validation = validatePassword(newPassword, user.email);
            
            if (!validation.isValid) {
                return rep.code(400).send({ error: validation.errors[0], details: validation.errors });
            }
            
            const isPasswordValid = await verifyPassword(oldPassword, user.password_hash);
            
            if (!isPasswordValid) {
                return rep.code(400).send({ error: 'Password is incorrect' });
            }
            
            await fastify.accountSecurity.resetPassword(userId, newPassword);
            return rep.code(200).send({ message: 'Password reset successfully' });
        } catch (e) {
            fastify.log.error(e);
            return rep.code(500).send({ error: 'Internal server error' });
        }
    }
    )
}