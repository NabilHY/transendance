
module.exports = async function (fastify) {
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
        const { friendId } = request.params;
        const userId = request.user.id;

        console.log("* FRIENDS: ", userId, " | friendId: ", friendId);
        try {
            const userFriendship = fastify.db.prepare(`
                SELECT status, blocked_by FROM friends 
                WHERE user_id = ? AND friend_id = ?
            `).get(userId, friendId)

            console.log("* FRIENDS: ", userFriendship);

            if(userFriendship && userFriendship.status === "blocked") {
                if(userFriendship.blocked_by === userId) {
                    return { status: 'blocker' };
                }
                return { status: 'blocked' };
            }

            const friendFriendship = fastify.db.prepare(`
                SELECT status, blocked_by FROM friends 
                WHERE user_id = ? AND friend_id = ?
            `).get(friendId, userId)

            console.log("* FRIENDS: ", friendFriendship);

            if(friendFriendship && friendFriendship.status === "blocked") {
                if(friendFriendship.blocked_by === userId) {
                    return { status: 'blocker' };
                }
                return { status: 'blocked' };
            }
            if (!userFriendship && !friendFriendship) {
                return { status: 'Add Friend' };
            }

            if(userFriendship)  
                return { status: userFriendship.status };
            return { status: friendFriendship.status };
        } catch (err) {
            console.error("Error retrieving friendship status:", err);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Add friend
    // fastify.post('/users/:id/friend', { preHandler: [fastify.authenticate], 
    //     schema: {
    //     tags: ['Users'],
    //     summary: 'Send friend request',
    //     security: [{ bearerAuth: [] }],
    //     params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    //     response: {
    //         201: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, requestId: { type: 'string' } }, required: ['success','message','requestId'] },
    //         400: { type: 'object', properties: { error: { type: 'string' } } },
    //         403: { type: 'object', properties: { error: { type: 'string' } } },
    //         404: { type: 'object', properties: { error: { type: 'string' } } }
    //     }
    // } }, async (request, reply) => {
    //     // console.log("***** REQUEST BODY *****", request.user);

    //     const { id } = request.body;
    //     const userId = request.user.id;

    //     console.log("* USR MANAG: ", userId + " wanna add friend " + id);

    //     if (Number(id) === Number(userId))
    //         return reply.code(400).send({ error: 'You cannot friend yourself' });
        
    //     // Check if target user exists in profiles
    //     const targetUser = fastify.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    //     if (!targetUser) {
    //         return reply.code(404).send({ error: 'Target user not found' });
    //     }
        
    //     const existing = fastify.db.prepare(`
    //         SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
    //     `).get(userId, id);

    //     const reverseExisting = fastify.db.prepare(`
    //         SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
    //     `).get(id, userId);

    //     if (reverseExisting && reverseExisting.status === 'pending') {
    //         // accept the friend request
    //         fastify.db.prepare("UPDATE friends SET status = 'accepted' WHERE id = ?").run(reverseExisting.id);
    //         return reply.code(200).send({
    //             success: true,
    //             message: 'Friend request accepted',
    //             requestId: reverseExisting.id
    //         });
    //     }

    //     const blockedByCheck = fastify.db.prepare(`
    //         SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
    //     `).get(id, userId);

        
    //     if (blockedByCheck && blockedByCheck.status === 'blocked' && blockedByCheck.blocked_by === id) {
    //         console.log("**** id: ", id, " |||| userID: ", userId);
            
    //         console.log("blocked by check: ", blockedByCheck);
    //         return reply.code(403).send({ error: 'You cannot friend this user because they have blocked you' });
    //     }

    //     if (existing) {
    //         if (existing.status === 'pending') {
    //             console.log("* USR ===> tfooooo 1");
                
    //             return reply.code(400).send({ error: 'Friend request already sent' });
    //         }
    //         if (existing.status === 'accepted') {
    //             console.log("* USR ===> tfooooo 2");

    //             return reply.code(400).send({ error: 'You are already friends' });
    //         }
    //         if (existing.status === 'blocked') {
    //             console.log("* USR ===> tfooooo 3");
    //             // return reply.code(403).send({ error: 'You cannot friend this user' });
    //             fastify.db.prepare("UPDATE friends SET status = 'pending' WHERE id = ?").run(existing.id);
    //             return reply.code(201).send({
    //                 success: true,
    //                 message: 'Friend request sent',
    //                 requestId: existing.id
    //             });
    //         }
    //         // console.log("* USR ===> tfooooo 4");

    //     }

    //     const isBlocked = fastify.db.prepare(`
    //         SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
    //     `).get(id, userId);

    //     if(isBlocked && isBlocked.status == 'blocked' && isBlocked.blocked_by === id) {
    //         // ! kont hna
    //         return reply.code(403).send({ error: 'You cannot friend this user because they have blocked you' });
    //     }

    //     const uuid = require('crypto').randomUUID();
    //     fastify.db.prepare(`
    //         INSERT INTO friends (id, user_id, friend_id, status, created_at)
    //         VALUES (?, ?, ?, 'pending', datetime('now'))
    //     `).run(uuid, userId, id);
        
    //     console.log("* USR MANAG: ", userId + " wanna add friend " + id);

    //     return reply.code(201).send({
    //         success: true,
    //         message: 'Friend request sent',
    //         requestId: uuid
    //     });
    // });

    fastify.post(
  '/users/:id/friend',
  {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Users'],
      summary: 'Send or accept friend request',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
  },
  async (request, reply) => {
    const { id: targetId } = request.body;
    const userId = request.user.id;

    if (userId === targetId) {
        return reply.code(400).send({ error: 'You cannot friend yourself' });
    }

    console.log("userID: ", userId, " wanna unblock targetID: ", targetId);
    
    const target = fastify.db
      .prepare('SELECT id FROM users WHERE id = ?')
      .get(targetId);

    if (!target) {
      return reply.code(404).send({ error: 'Target user not found' });
    }

    const existing = fastify.db.prepare(`
      SELECT * FROM friends
      WHERE user_id = ? AND friend_id = ?
    `).get(userId, targetId);

    const reverse = fastify.db.prepare(`
      SELECT * FROM friends
      WHERE user_id = ? AND friend_id = ?
    `).get(targetId, userId);

        console.log("reverse: ", reverse);
        console.log("-----------------------------------");
        console.log("existing: ", existing);

    if (
      reverse?.status === 'blocked' &&
      reverse.blocked_by === targetId
    ) {
      return reply
        .code(403)
        .send({ error: 'This user has blocked you' });
    }

    if (
      existing?.status === 'blocked' &&
      existing.blocked_by === userId
    ) {
      return reply
        .code(403)
        .send({ error: 'You have blocked this user' });
    }

    if (reverse?.status === 'pending') {
      fastify.db
        .prepare(`UPDATE friends SET status = 'accepted' WHERE id = ?`)
        .run(reverse.id);

      return reply.code(200).send({
        success: true,
        message: 'Friend request accepted',
        requestId: reverse.id,
      });
    }

    if (existing) {
      if (existing.status === 'pending') {
        return reply
          .code(400)
          .send({ error: 'Friend request already sent' });
      }

      if (existing.status === 'accepted') {
        return reply
            .code(400)
            .send({ error: 'You are already friends' });
      }
    }

    const requestId = crypto.randomUUID();

    fastify.db.prepare(`
      INSERT INTO friends (id, user_id, friend_id, status, created_at)
      VALUES (?, ?, ?, 'pending', datetime('now'))
    `).run(requestId, userId, targetId);

    return reply.code(201).send({
      success: true,
      message: 'Friend request sent',
      requestId,
    });
  }
);

    fastify.post('/users/:id/unblock', { preHandler: [fastify.authenticate], 
        schema: {
        tags: ['Users'],
        summary: 'Unblock a user',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        response: {
            200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } }, required: ['success','message'] },
            404: { type: 'object', properties: { error: { type: 'string' } } }
        }
    } }, async (request, reply) => {
        const { id } = request.params;
        const userId = request.user.id;

        console.log("id: ", id, " | userID: ", userId);

        const blockedRelationship = fastify.db.prepare(`
            SELECT * FROM friends WHERE 
            ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
            AND status = 'blocked'
        `).get(userId, id, id, userId);

        if (!blockedRelationship) {
            return reply.code(404).send({ error: 'No blocked relationship found' });
        }

        fastify.db.prepare(`
            UPDATE friends SET status = 'accepted', blocked_by = NULL WHERE id = ?
        `).run(blockedRelationship.id);

        return { success: true, message: 'User unblocked successfully' };
    });

    // Block user
    fastify.post('/users/:id/block', { preHandler: [fastify.authenticate], 
        schema: {
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
        const { id } = request.params;
        const userId = request.user.id;

        console.log("id: ", id, " | userID: ", userId);
        

        if (Number(id) === Number(userId)) {
            return reply.code(400).send({ error: 'You cannot block yourself' });
        }

        const targetUser = fastify.db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (!targetUser) {
            return reply.code(404).send({ error: 'Target user not found' });
        }

        const userBlocksTarget = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'blocked'
        `).get(userId, id);

        if (userBlocksTarget) {
            return reply.code(400).send({ error: 'User already blocked' });
        }

        const existingFriendship = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
        `).get(userId, id);

        if (existingFriendship) {
            fastify.db.prepare("UPDATE friends SET status = 'blocked', blocked_by = ? WHERE id = ?").run(userId, existingFriendship.id);
            return reply.code(201).send({ success: true, message: 'User blocked' });
        }

        const reverseRelationship = fastify.db.prepare(`
            SELECT * FROM friends WHERE user_id = ? AND friend_id = ?
        `).get(id, userId);

        if (reverseRelationship) {
            fastify.db.prepare("UPDATE friends SET status = 'blocked', blocked_by = ? WHERE id = ?").run(userId, reverseRelationship.id);
            return reply.code(201).send({ success: true, message: 'User blocked' });
        }

        const uuid = require('crypto').randomUUID();
        fastify.db.prepare(`
            INSERT INTO friends (id, user_id, friend_id, status, blocked_by, created_at)
            VALUES (?, ?, ?, 'blocked', ?, datetime('now'))
        `).run(uuid, userId, id, userId);

        return reply.code(201).send({ success: true, message: 'User blocked' });
    });

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
            SELECT u.id, u.username, u.first_name, u.last_name, u.profile_pic, u.avatar_updated_at, u.is_online, f.status
            FROM friends f
            JOIN users u ON (
                CASE 
                    WHEN f.user_id = ? THEN f.friend_id = u.id
                    WHEN f.friend_id = ? THEN f.user_id = u.id
                END
            )
            WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
        `).all(userId, userId, userId, userId);

        return friends;
    });

}