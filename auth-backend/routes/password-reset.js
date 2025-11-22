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
                required: ['oldPassword', 'newPassword'],
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
            
            const { oldPassword, newPassword } = req.body || {};
            
            if (!oldPassword || !newPassword) {
                return rep.code(400).send({ error: 'Old password and new password are required' });
            }
            
            // Check if old and new passwords are the same (plain text comparison)
            if (req.body.oldPassword === req.body.newPassword) {
                return rep.code(400).send({ error: 'New password cannot be the same as the old password' });
            }
            
            const userId = fastify.accountSecurity.getUserId(req);
            
            const user = await fastify.accountSecurity.getUserData(userId);
            
            const isLocked = await fastify.accountSecurity.isLocked(userId);
            if (isLocked) {
                return rep.code(423).send({ error: 'Account is temporarily locked due to too many failed attempts' });
            }
            
        
            
            const isPasswordMatched = await verifyPassword(oldPassword, user.password_hash);
            
            if (!isPasswordMatched) {
                return rep.code(400).send({ error: 'Password is incorrect' });
            }

            const validation = validatePassword(newPassword, user.email);
            if (!validation.isValid) {
                return rep.code(400).send({ error: validation.errors[0] });
            }
            
            await fastify.accountSecurity.resetPassword(userId, newPassword);
            
            await fastify.accountSecurity.deleteRefreshToken(userId);
            
            return rep.code(200).send({ message: 'Password reset successfully' });
        } catch (e) {
            fastify.log.error(e);
            return rep.code(500).send({ error: 'Internal server error' });
        }
    }
    )
}