const { verifyPassword } = require('../utils/hash');
const config = require('../config');

module.exports = async function (fastify) {
    fastify.delete('/delete-user', {
        schema: {
            description: 'Delete user account and all associated data',
            tags: ['User Management'],
            summary: 'Delete User',
            security: [
                {
                    Bearer: []
                }
            ],
            body: {
                type: 'object',
                required: ['password'],
                properties: {
                    password: { type: 'string' }
                }
            },
            response: {
                200: {
                    description: 'User deleted successfully',
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                },
                400: {
                    description: 'Bad request - Invalid or missing password',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                401: {
                    description: 'Unauthorized - Invalid or missing JWT token',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                403: {
                    description: 'Forbidden - CSRF token missing or invalid',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                500: {
                    description: 'Internal server error',
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        preHandler: [fastify.authenticate]
    }, async (req, res) => {
        try {
            const { password } = req.body || {};
            
            if (!password) {
                return res.code(400).send({ error: 'Password is required' });
            }
            // TODO: Implement actual deletion logic
            const userId = req.user.sub;
            
            // Get user's password hash
            const user = await new Promise((resolve, reject) => {
                fastify.db.get(
                    'SELECT password_hash FROM users WHERE id = ?',
                    [userId],
                    (err, row) => err ? reject(err) : resolve(row)
                );
            });
            
            if (!user) {
                return res.code(404).send({ error: 'User not found' });
            }
            
            // Verify password
            const isPasswordValid = await verifyPassword(password, user.password_hash);
            if (!isPasswordValid) {
                return res.code(400).send({ error: 'Invalid password' });
            }
            
            console.log("\n\nDELETING USER :::::: \n\n");
            
            // Password verified, proceed with deletion
            await fastify.deleteUser(userId);
            
            res.clearCookie('accessToken', {
                path: '/' ,
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            
            res.clearCookie('refreshToken', {
                path: '/',
                httpOnly: true,
                secure: config.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            
            console.log("User Deleted Successefully !");
            
            return res.code(200).send({
                message: 'User Account Deleted Successefully'
            });        
        } catch (e) {
            fastify.log.error('Error deleting user:', e);
            
            return res.code(500).send( {e: 'Internal server error'} );
        }
    });
};