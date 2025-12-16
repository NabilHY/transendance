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
                        profile_pic: { type: 'string', nullable: true },
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
        
        let sql = `
            SELECT id, username, first_name, last_name, 
                   profile_pic, is_online, created_at
            FROM users
        `;
        let params = [];
        
        if (search) {
            sql += ` WHERE username LIKE ? OR first_name LIKE ? OR last_name LIKE ?`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm];
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
                    profile_pic: { type: 'string', nullable: true },
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
            profile_pic, is_online, created_at, updated_at
            FROM users 
            WHERE id = ?
        `).get(id);
        
        if (!profile) {
            return reply.code(404).send({ error: 'User not found' });
        }
        
        return profile;
    });

    fastify.get('/users/:id/friends/:friendId/invitation', { preHandler: [fastify.authenticate], 
        schema: {
        tags: ['Users'],
        summary: 'Get friendship invitation status with a user',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            properties: { id: { type: 'integer' }, friendId: { type: 'integer' } },
            required: ['id', 'friendId']
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['none', 'pending', 'accepted', 'blocked'] }
                }
            },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    }}, async (request, reply) => {
        const { id, friendId } = request.params;
        const userId = request.user.id;

        console.log("* INVITATIONS: ", userId, " | friendId: ", friendId); 
        const invitation = fastify.db.prepare(`
            SELECT status FROM friends 
            WHERE user_id = ? AND friend_id = ? AND status = 'pending'
        `).get(friendId, userId);
        console.log("* INVITATIONS: ", invitation);
        if (!invitation)
            return { status: 'false' };
        return { status: "true" };
    });

    // return status of friendship with another user
    fastify.get('/users/:id/friends/:friendId', { preHandler: [fastify.authenticate], 
        schema: {
        tags: ['Users'],
        summary: 'Get friendship status with a user',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            properties: { id: { type: 'integer' }, friendId: { type: 'integer' } },
            required: ['id', 'friendId']
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['none', 'pending', 'accepted', 'blocked'] }
                }
            },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const { id, friendId } = request.params;
        const userId = request.user.id;

        console.log("* FRIENDS: ", userId, " | friendId: ", friendId);

        const userFriendship = fastify.db.prepare(`
            SELECT status FROM friends 
            WHERE user_id = ? AND friend_id = ?
        `).get(userId, friendId)

        console.log("* FRIENDS: ", userFriendship);

        if(userFriendship && userFriendship.status === "blocked") {
            return { status: 'blocker' };
        }

        const friendFriendship = fastify.db.prepare(`
            SELECT status FROM friends 
            WHERE user_id = ? AND friend_id = ?
        `).get(friendId, userId)

        console.log("* FRIENDS: ", friendFriendship);

        if(friendFriendship && friendFriendship.status === "blocked") {
            return { status: 'blocked' };
        }
        if (!userFriendship && !friendFriendship) {
            return { status: 'Add Friend' };
        }

        if(userFriendship)  
            return { status: userFriendship.status };
        return { status: friendFriendship.status };
    });

    // Add friend
    fastify.post('/users/:id/friend', { preHandler: [fastify.authenticate], schema: {
        tags: ['Users'],
        summary: 'Send friend request',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        response: {
            201: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, requestId: { type: 'string' } }, required: ['success','message','requestId'] },
            400: { type: 'object', properties: { error: { type: 'string' } } },
            403: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        // console.log("***** REQUEST BODY *****", request.user);

        const { id } = request.body;
        const userId = request.user.id;

        // console.log("* USR MANAG: ", userId + " wanna add friend " + id);

        if (Number(id) === Number(userId))
            return reply.code(400).send({ error: 'You cannot friend yourself' });
        
        // Check if target user exists in profiles
        const targetUser = fastify.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!targetUser) {
            return reply.code(404).send({ error: 'Target user not found' });
        }
        
        // Check existing relationship
        const existing = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
        `).get(userId, id);

        if (existing) {
            if (existing.status === 'pending') {
                console.log("* USR ===> tfooooo 1");
                
                return reply.code(400).send({ error: 'Friend request already sent' });
            }
            if (existing.status === 'accepted') {
                console.log("* USR ===> tfooooo 2");

                return reply.code(400).send({ error: 'You are already friends' });
            }
            if (existing.status === 'blocked') {
                console.log("* USR ===> tfooooo 3");
                // return reply.code(403).send({ error: 'You cannot friend this user' });
                fastify.db.prepare("UPDATE friends SET status = 'pending' WHERE id = ?").run(existing.id);
                return reply.code(201).send({
                    success: true,
                    message: 'Friend request sent',
                    requestId: existing.id
                });
            }
        }

        const isBlocked = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
        `).get(id, userId);

        if(isBlocked && isBlocked.status == 'blocked') {
            // ! kont hna
            return reply.code(403).send({ error: 'You cannot friend this user because they have blocked you' });
        }

        const uuid = require('crypto').randomUUID();
        fastify.db.prepare(`
            INSERT INTO friends (id, user_id, friend_id, status, created_at)
            VALUES (?, ?, ?, 'pending', datetime('now'))
        `).run(uuid, userId, id);
        
        console.log("* USR MANAG: ", userId + " wanna add friend " + id);

        return reply.code(201).send({
            success: true,
            message: 'Friend request sent',
            requestId: uuid
        });
    });

    // Block user
    fastify.post('/users/:id/block', { preHandler: [fastify.authenticate], schema: {
        tags: ['Users'],
        summary: 'Block a user',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        response: {
            201: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } }, required: ['success','message'] },
            400: { type: 'object', properties: { error: { type: 'string' } } },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        console.log("******** block ********");
        const { id } = request.body;
        const userId = request.user.id;

        console.log("id: ", id, " | userID: ", userId);

        if (Number(id) === Number(userId)) {
            return reply.code(400).send({ error: 'You cannot block yourself' });
        }

        // Check if target user exists in profiles
        const targetUser = fastify.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!targetUser) {
            return reply.code(404).send({ error: 'Target user not found' });
        }

        // Check existing relationship
        const existing = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
        `).get(userId, id);

        if (existing && existing.status === 'blocked') {
            return reply.code(400).send({ error: 'User already blocked' });
        }

        if (existing) {
            // Update existing relationship to blocked
            fastify.db.prepare("UPDATE friends SET status = 'blocked' WHERE id = ?").run(existing.id);
            return { success: true, message: 'User blocked' };
        }

        // Create new blocked relationship
        const uuid = require('crypto').randomUUID();
        fastify.db.prepare(`
            INSERT INTO friends (id, user_id, friend_id, status, created_at)
            VALUES (?, ?, ?, 'blocked', datetime('now'))
        `).run(uuid, userId, id);

        return reply.code(201).send({ success: true, message: 'User blocked' });
    });

    // accept a friend request
    fastify.post('/users/:id/friends/accept', { preHandler: [fastify.authenticate]}, async (request, reply) => {

        console.log(" ***** Accept *****");

        const { friendId } = request.body;
        const userId = request.user.id;

        const friendship = fastify.db.prepare(`
            SELECT * FROM friends 
            WHERE user_id = ? AND friend_id = ? AND status = 'pending'
        `).get(friendId, userId);

        if (!friendship) {
            return reply.code(404).send({ error: 'Friend request not found' });
        }

        fastify.db.prepare(`
            UPDATE friends SET status = 'accepted' WHERE id = ?
        `).run(friendship.id);  

        return { success: true, message: 'Friend request accepted' };
    });

    fastify.post('/users/:id/friends/reject', { preHandler: [fastify.authenticate]}, async (request, reply) => {


        const { friendId } = request.body;
        const userId = request.user.id;

        const friendship = fastify.db.prepare(`
            SELECT * FROM friends 
            WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?) AND status = 'pending'
        `).get(friendId, userId, userId, friendId);

        if (!friendship) {
            return reply.code(404).send({ error: 'Friend request not found' });
        }

        fastify.db.prepare(`
            DELETE FROM friends WHERE id = ?
        `).run(friendship.id);  

        return { success: true, message: 'Friend request rejected' };
    });

    fastify.get("/me/friends", { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const userId = request.user.id;

        const friends = fastify.db.prepare(`
            SELECT u.id, u.username, u.first_name, u.last_name, u.profile_pic, u.is_online, f.status
            FROM friends f
            JOIN users u ON (f.friend_id = u.id)
            WHERE f.user_id = ? AND f.status = 'accepted'
        `).all(userId);

        return friends;
    });

};
