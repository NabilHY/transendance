module.exports = async function (fastify) {
    // Get current user profile
    fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
    fastify.patch('/me/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
    fastify.delete('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
