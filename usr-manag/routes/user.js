const { log } = require('console');

module.exports = async function (fastify) {
    // Get all users or search users
    fastify.get('/users', { preHandler: [fastify.authenticate], schema: {
        tags: ['Users'],
        summary: 'List or search users',
        security: [{ bearerAuth: [] }],
        querystring: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Search by username, first or last name' }
            }
        },
        response: {
            200: {
                description: 'List of users',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string', nullable: true },
                        first_name: { type: 'string', nullable: true },
                        last_name: { type: 'string', nullable: true },
                        profile_pic: { type: 'string', nullable: true, description: 'Object key (not a URL). Use /users/:id/avatar to get presigned URL.' },
                        avatar_updated_at: { type: 'integer', nullable: true, description: 'Unix timestamp in milliseconds when avatar was last updated' },
                        is_online: { type: 'integer', enum: [0,1] },
                        created_at: { type: 'string' }
                    }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: { error: { type: 'string' } }
            }
        }
    } }, async (request, reply) => {
        const { search } = request.query || {};
        const currentUserId = request.user?.id;
        if (!currentUserId) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        
        let sql = `
            SELECT id, username, first_name, last_name, 
                   profile_pic, avatar_updated_at, is_online, created_at
            FROM users u
            WHERE u.id != ?
              AND NOT EXISTS (
                SELECT 1 FROM friends f
                WHERE f.status = 'blocked'
                  AND (
                    (f.user_id = ? AND f.friend_id = u.id)
                    OR
                    (f.user_id = u.id AND f.friend_id = ?)
                  )
              )
        `;
        let params = [currentUserId, currentUserId, currentUserId];
        
        if (search) {
            sql += ` AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ` ORDER BY created_at DESC`;
        
        const users = fastify.db.prepare(sql).all(...params);
        return users;
    });

    // Get user by ID
    fastify.get('/users/:id', { preHandler: [fastify.authenticate], schema: {
        tags: ['Users'],
        summary: 'Get user by id',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            properties: { id: { type: 'integer' } },
            required: ['id']
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    username: { type: 'string', nullable: true },
                    first_name: { type: 'string', nullable: true },
                    last_name: { type: 'string', nullable: true },
                        profile_pic: { type: 'string', nullable: true, description: 'Object key (not a URL). Use /users/:id/avatar to get presigned URL.' },
                        avatar_updated_at: { type: 'integer', nullable: true, description: 'Unix timestamp in milliseconds when avatar was last updated' },
                        is_online: { type: 'integer', enum: [0,1] },
                        created_at: { type: 'string' },
                        updated_at: { type: 'string' }
                }
            },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const { id } = request.params;
        
        const profile = fastify.db.prepare(`
            SELECT id, username, first_name, last_name, 
            profile_pic, avatar_updated_at, is_online, created_at, updated_at
            FROM users 
            WHERE id = ?
        `).get(id);
        
        if (!profile) {
            return reply.code(404).send({ error: 'User not found' });
        }
        
        return profile;
    });

};
