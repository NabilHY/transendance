module.exports = async function (fastify) {
    // Get current user profile
    fastify.get('/me', { preHandler: [fastify.authenticate], schema: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    username: { type: 'string', nullable: true },
                    first_name: { type: 'string', nullable: true },
                    last_name: { type: 'string', nullable: true },
                    profile_pic: { type: 'string', nullable: true },
                    is_online: { type: 'integer', enum: [0,1] },
                    created_at: { type: 'string' },
                    updated_at: { type: 'string' }
                }
            },
            401: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const userId = request.user.id;
        
        const profile = fastify.db.prepare(`
            SELECT id, username, first_name, last_name, 
                   profile_pic, is_online, created_at, updated_at
            FROM users 
            WHERE id = ?
        `).get(userId);
        
        if (!profile) {
            // Create default profile if doesn't exist
            fastify.db.prepare(`
                UPDATE users SET username = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(`user_${userId}`, userId);
            
            return {
                id: userId,
                username: `user_${userId}`,
                first_name: null,
                last_name: null,
                profile_pic: null,
                is_online: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
        
        return profile;
    });

    // Update online status
    fastify.patch('/me/status', { preHandler: [fastify.authenticate], schema: {
        tags: ['Profile'],
        summary: 'Update online status',
        security: [{ bearerAuth: [] }],
        body: { type: 'object', properties: { is_online: { type: 'boolean' } }, required: ['is_online'] },
        response: {
            200: { type: 'object', properties: { success: { type: 'boolean' }, is_online: { type: 'boolean' } }, required: ['success','is_online'] },
            401: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const { is_online } = request.body || {};
        const userId = request.user.id;
        
        fastify.db.prepare(`
            UPDATE users SET 
                is_online = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).run(is_online ? 1 : 0, userId);
        
        return { success: true, is_online: !!is_online };
    });

    // Delete user profile (not the auth account)
    fastify.delete('/me', { preHandler: [fastify.authenticate], schema: {
        tags: ['Profile'],
        summary: 'Delete current user profile data',
        security: [{ bearerAuth: [] }],
        response: {
            200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } }, required: ['success','message'] },
            401: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const userId = request.user.id;
        
        const changes = fastify.db.prepare(`
            UPDATE users SET 
                username = NULL,
                first_name = NULL,
                last_name = NULL,
                profile_pic = NULL,
                is_online = 0,
                updated_at = datetime('now')
            WHERE id = ?
        `).run(userId).changes;
        
        if (changes === 0) {
            return reply.code(404).send({ error: 'Profile not found' });
        }
        
        return { success: true, message: 'Profile deleted' };
    });
};
