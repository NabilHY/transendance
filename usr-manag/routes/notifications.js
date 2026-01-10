const notificationHandler = require('./notificationHandler');

module.exports = async function (fastify) {
    const db = fastify.db;

    fastify.get('/notifications', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            if (!request.user?.id) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }

            const stmt = db.prepare(`
                SELECT 
                    n.*,
                    u.first_name, u.last_name, u.username, u.avatar_url
                FROM notifications n
                LEFT JOIN users u ON n.sender_id = u.id
                WHERE n.recipient_id = ? AND n.is_dismissed = 0
                ORDER BY n.created_at DESC
                LIMIT 50
            `);
            
            const notifications = stmt.all(request.user.id);

            const parsedNotifications = notifications.map(n => ({
                ...n,
                data: n.data ? JSON.parse(n.data) : null
            }));

            return reply.send({ notifications: parsedNotifications });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to fetch notifications' });
        }
    });

    fastify.get('/notifications/count', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            if (!request.user?.id) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }

            const stmt = db.prepare(`
                SELECT COUNT(*) as count FROM notifications 
                WHERE recipient_id = ? AND is_read = 0 AND is_dismissed = 0
            `);
            const row = stmt.get(request.user.id);
            const count = row?.count || 0;

            return reply.send({ unreadCount: count });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to fetch count' });
        }
    });

    fastify.patch('/notifications/:notificationId/read', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            if (!request.user?.id) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }

            const { notificationId } = request.params;

            const stmt = db.prepare(`
                UPDATE notifications 
                SET is_read = 1, read_at = ? 
                WHERE id = ? AND recipient_id = ?
            `);
            stmt.run(Math.floor(Date.now() / 1000), notificationId, request.user.id);

            return reply.send({ success: true });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to update notification' });
        }
    });

    fastify.patch('/notifications/:notificationId/dismiss', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            if (!request.user?.id) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }

            const { notificationId } = request.params;

            const stmt = db.prepare(`
                UPDATE notifications 
                SET is_dismissed = 1, dismissed_at = ? 
                WHERE id = ? AND recipient_id = ?
            `);
            stmt.run(Math.floor(Date.now() / 1000), notificationId, request.user.id);

            return reply.send({ success: true });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to dismiss notification' });
        }
    });

    fastify.post('/notifications/match-invite', {preHandler: fastify.authenticate} , async (request, reply) => {
        console.log("daaaaaaaaaaaaaaaaamn");
        
        try {
            const { recipientId, senderId, matchType, gameData } = request.body;

            if (!recipientId || !senderId) {
                return reply.code(400).send({ message: 'recipientId and senderId required' });
            }

            const senderStmt = db.prepare(`
                SELECT id, first_name, last_name, username FROM users WHERE id = ?
            `);
            const sender = senderStmt.get(senderId);

            if (!sender) {
                return reply.code(404).send({ message: 'Sender not found' });
            }

            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + 60;

            const insertStmt = db.prepare(`
                INSERT INTO notifications (
                    recipient_id, sender_id, type, title, message, data, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = insertStmt.run(
                recipientId,
                senderId,
                'match_invite',
                'Match Invite',
                `${sender.first_name} ${sender.last_name} invited you to a match`,
                JSON.stringify({
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`,
                    matchType: matchType || 'matchmaking',
                    gameData: gameData || {}
                }),
                expiresAt
            );

            const notification = {
                id: result.lastInsertRowid,
                recipient_id: recipientId,
                sender_id: senderId,
                type: 'match_invite',
                title: 'Match Invite',
                message: `${sender.first_name} ${sender.last_name} invited you to a match`,
                data: {
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`,
                    matchType: matchType || 'matchmaking',
                    gameData: gameData || {}
                },
                is_read: 0,
                is_dismissed: 0,
                created_at: now,
                expires_at: expiresAt,
                first_name: sender.first_name,
                last_name: sender.last_name,
                username: sender.username
            };
            
            notificationHandler.sendNotificationToUser(recipientId, notification);

            return reply.code(201).send({ success: true, message: 'Notification created' });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to create notification' });
        }
    });

    fastify.post('/notifications/friend-request', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            const { recipientId, senderId } = request.body;

            if (!recipientId || !senderId) {
                return reply.code(400).send({ message: 'recipientId and senderId required' });
            }

            const senderStmt = db.prepare(`
                SELECT id, first_name, last_name, username FROM users WHERE id = ?
            `);
            const sender = senderStmt.get(senderId);

            if (!sender) {
                return reply.code(404).send({ message: 'Sender not found' });
            }

            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + (3600 * 24 * 30);

            const insertStmt = db.prepare(`
                INSERT INTO notifications (
                    recipient_id, sender_id, type, title, message, data, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = insertStmt.run(
                recipientId,
                senderId,
                'friend_request',
                'Friend Request',
                `${sender.first_name} ${sender.last_name} sent you a friend request`,
                JSON.stringify({
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`
                }),
                expiresAt
            );

            const notification = {
                id: result.lastInsertRowid,
                recipient_id: recipientId,
                sender_id: senderId,
                type: 'friend_request',
                title: 'Friend Request',
                message: `${sender.first_name} ${sender.last_name} sent you a friend request`,
                data: {
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`
                },
                is_read: 0,
                is_dismissed: 0,
                created_at: now,
                expires_at: expiresAt,
                first_name: sender.first_name,
                last_name: sender.last_name,
                username: sender.username
            };
            
            notificationHandler.sendNotificationToUser(recipientId, notification);

            return reply.code(201).send({ success: true, message: 'Notification created' });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to create notification' });
        }
    });

    fastify.post('/notifications/message', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            const { recipientId, senderId, messagePreview, conversation, channelId } = request.body;

            const resolvedChannelId =
                channelId ??
                (conversation && (conversation.channelId ?? conversation.channel_id));

            if (!recipientId || !senderId) {
                return reply.code(400).send({ message: 'recipientId and senderId required' });
            }

            const senderStmt = db.prepare(`
                SELECT id, first_name, last_name, username, avatar_url FROM users WHERE id = ?
            `);
            const sender = senderStmt.get(senderId);

            if (!sender) {
                return reply.code(404).send({ message: 'Sender not found' });
            }

            const now = Math.floor(Date.now() / 1000);
            const expiresAt = now + (3600 * 24 * 7);

            const insertStmt = db.prepare(`
                INSERT INTO notifications (
                    recipient_id, sender_id, type, title, message, data, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = insertStmt.run(
                recipientId,
                senderId,
                'message',
                'New Message',
                `${sender.first_name} ${sender.last_name} sent you a message`,
                JSON.stringify({
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`,
                    messagePreview: messagePreview || '',
                    channelId: resolvedChannelId,
                    conversation: {
                        ...(conversation || {}),
                        channelId: resolvedChannelId,
                    }
                }),
                expiresAt
            );

            const notification = {
                id: result.lastInsertRowid,
                recipient_id: recipientId,
                sender_id: senderId,
                type: 'message',
                title: 'New Message',
                message: `${sender.first_name} ${sender.last_name} sent you a message`,
                data: {
                    senderUsername: sender.username,
                    senderName: `${sender.first_name} ${sender.last_name}`,
                    messagePreview: messagePreview || '',
                    channelId: resolvedChannelId,
                    conversation: {
                        ...(conversation || {}),
                        channelId: resolvedChannelId,
                    }
                },
                is_read: 0,
                is_dismissed: 0,
                created_at: now,
                expires_at: expiresAt,
                first_name: sender.first_name,
                last_name: sender.last_name,
                username: sender.username,
                avatar_url: sender.avatar_url
            };
            
            notificationHandler.sendNotificationToUser(recipientId, notification);

            return reply.code(201).send({ success: true, message: 'Notification created' });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to create notification' });
        }
    });

    fastify.patch('/notifications/mark-all-read', {preHandler: fastify.authenticate} , async (request, reply) => {
        try {
            if (!request.user?.id) {
                return reply.code(401).send({ message: 'Unauthorized' });
            }

            const now = Math.floor(Date.now() / 1000);

            const stmt = db.prepare(`
                UPDATE notifications 
                SET is_read = 1, read_at = ? 
                WHERE recipient_id = ? AND is_read = 0
            `);
            stmt.run(now, request.user.id);

            return reply.send({ success: true });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ message: 'Failed to mark notifications as read' });
        }
    });
};
