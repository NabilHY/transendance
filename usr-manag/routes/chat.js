// import crypto from 'crypto';

module.exports = async function (fastify) {

    fastify.get('/conversations/:id', { preHandler: [fastify.authenticate] }, async (req, reply) => {

    const { id } = req.params;

    try {
        const channels = fastify.db.prepare(`
        SELECT
            c.id,
            c.name,
            c.is_private,
            c.description,
            c.created_by,
            c.created_at,
            c.updated_at,
            c.last_message_id,
            c.avatar,
            m.id AS last_message_id,
            m.content AS last_message_content,
            m.sender_id AS last_message_sender,
            m.sent_at AS last_message_time
        FROM Channels c
        JOIN channel_members cm ON cm.channel_id = c.id
        LEFT JOIN messages m ON c.last_message_id = m.id
        WHERE cm.user_id = ?
        ORDER BY m.sent_at DESC
    `).all(id);
        if(!channels) {
            console.log("* ERROR: channels are empty");
            return reply.send([]);
        }

        console.log("all channels: ", channels);
        
        return reply.send(channels);
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: 'Failed to fetch conversations' });
        }
    });

    // const res = await fetch(`http://localhost:${userMgntPort}/channel/${channelId}/members`, {
    fastify.get('/channel/:id/members', async (req, reply) => {
        const { id } = req.params;

        try {
            const members = fastify.db
            .prepare(`SELECT user_id FROM channel_members WHERE channel_id = ?`)
            .all(id);

            return members.map(m => m.user_id);
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: 'Failed to fetch channel members' });
        }

    });

        // check if a direct conversation between you & them exists
        
    fastify.get('/chat/direct/:targetUserId', { preHandler: [fastify.authenticate] }, async (req, reply) => {
        console.log("check direct messages");

        const userId = req.user.id;
        const targetUserId = req.params.targetUserId;

        try {
            const conversation = fastify.db.prepare(`
                SELECT c.id
                FROM channels c
                JOIN channel_members cm1 ON c.id = cm1.channel_id
                JOIN channel_members cm2 ON c.id = cm2.channel_id
                WHERE c.is_private = 1
                AND cm1.user_id = ?
                AND cm2.user_id = ?
                LIMIT 1
            `).get(userId.toString(), targetUserId.toString());

            console.log("found conversation: ", conversation);
            

            return reply.send({
                conversationId: conversation ? conversation.id : -1
            });

        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: "Failed to check direct conversation" });
        }
    });

    fastify.post('/chat/direct', { preHandler: [fastify.authenticate] }, async (req, reply) => {
        console.log("-------------- tfoooooooo --------------");
        const userId = req.user.id;
        const { targetUserId } = req.body;

        

        if (!targetUserId)
            return reply.status(400).send({ error: "Missing targetUserId" });

        try {
            // 1. Check if DM already exists (safe double-check)
            const existing = fastify.db.prepare(`
                SELECT c.id
                FROM channels c
                JOIN channel_members m1 ON c.id = m1.channel_id
                JOIN channel_members m2 ON c.id = m2.channel_id
                WHERE c.is_private = 1
                AND m1.user_id = ?
                AND m2.user_id = ?
                LIMIT 1
            `).get(userId, targetUserId);

            // console.log("existing dm: ", existing);

            if (existing !== undefined && existing !== null) {
                return reply.send({ conversationId: existing.id });
            }

            const uniqueId = crypto.randomUUID();

            const result = fastify.db.prepare(`
                INSERT INTO channels (id, name, is_private, created_at, created_by)
                VALUES (? ,?, ?, datetime('now'), ?)
            `).run(uniqueId, null, 1, userId.toString());

            const channelId = result.lastInsertRowid;
            
            const insertDM = fastify.db.transaction(() => {
                console.log("channel_id ===> ", channelId, " | result ====> ", result);
                

                fastify.db.prepare(`
                    INSERT INTO channel_members (channel_id, user_id, role)
                    VALUES (?, ?, ?)
                `).run(uniqueId, userId.toString(), 'member');

                fastify.db.prepare(`
                    INSERT INTO channel_members (channel_id, user_id, role)
                    VALUES (?, ?, ?)
                `).run(uniqueId, targetUserId.toString(), 'member');

                return uniqueId;
            });

            const newChannelId = insertDM();

            return reply.send({
                conversationId: newChannelId,
                created: true,
            });

        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: "Failed to create direct conversation" });
        }
    });

    //get channel info
    fastify.get('/channel/:id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
        const { id } = req.params;
        console.log("id ===> ", id);

        try {
            const channel = fastify.db.prepare(`
                SELECT *
                FROM channels
                WHERE id = ?
            `).get(id);

            if (!channel) {
                return reply.status(404).send({ error: "Channel not found" });
            }

            return reply.send(channel);
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: "Failed to fetch channel info" });
        }
    });

//   interface Message {
//   uuid: string;
//   channel_id: string;
//   sender_id: string;
//   sent_at: string;
//   content: string;
//   sender_name?: string;
//   receiver_id?: string[];
//   pending?: number;
// }

    fastify.get('/chat/:channelId/messages', { preHandler: [fastify.authenticate] }, async (req, reply) => {
        const userId = req.user.id;
        const { channelId } = req.params;

        try {
            // Verify membership
            console.log("channelId: ", channelId, " | user_id: ", userId);
            
            const membership = fastify.db.prepare(`
                SELECT 1 FROM channel_members
                WHERE channel_id = ? AND user_id = ?
            `).get(channelId, userId.toString());

            console.log("membership 11: ", membership);
            
            if (!membership)
                return reply.status(403).send({ error: "Access denied to this channel's messages" });

            console.log("membership 22: ", membership);

            const messages = fastify.db.prepare(`
                SELECT m.*, u.username AS sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.channel_id = ?
                ORDER BY m.sent_at ASC
            `).all(channelId);

            console.log("messages: ", messages);
            

            return reply.send(messages);
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: "Failed to fetch messages" });
        }
    });

    // get the the user's name if the channel is private
    fastify.get('/channel/:id/name', { preHandler: [fastify.authenticate] }, async (req, reply) => {
        const userId = req.user.id;
        const { id } = req.params;
        try {
            const channel = fastify.db.prepare(`
                SELECT is_private FROM channels WHERE id = ?
            `).get(id);

            if (!channel) {
                return reply.status(404).send({ error: "Channel not found" });
            }

            if (channel.is_private) {
                const member = fastify.db.prepare(`
                    SELECT u.first_name, u.last_name
                    FROM channel_members cm
                    JOIN users u ON cm.user_id = u.id
                    WHERE cm.channel_id = ? AND cm.user_id != ?
                `).get(id, userId.toString());

                return reply.send({ name: member ? `${member.first_name} ${member.last_name}` : "Unknown" });
            } else {
                const publicChannel = fastify.db.prepare(`
                    SELECT name FROM channels WHERE id = ?
                `).get(id);
                return reply.send({ name: publicChannel.name });
            }
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ error: "Failed to fetch channel name" });
        }
    });       
};