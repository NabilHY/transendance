/**
 * WebSocket Notification Handler
 * Broadcasts notifications to connected users in real-time
 */

const notificationConnections = new Map(); // userId -> Set of WebSocket connections

/**
 * Register a user's WebSocket connection for notifications
 */
function registerNotificationConnection(userId, ws) {
    if (!notificationConnections.has(userId)) {
        notificationConnections.set(userId, new Set());
    }
    notificationConnections.get(userId).add(ws);
    console.log(`✅ Notification connection registered for user ${userId}`);
}

/**
 * Unregister a user's WebSocket connection
 */
function unregisterNotificationConnection(userId, ws) {
    const connections = notificationConnections.get(userId);
    if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
            notificationConnections.delete(userId);
        }
    }
}

/**
 * Send a notification to a user through WebSocket if they're connected
 */
function sendNotificationToUser(userId, notification) {
    const connections = notificationConnections.get(userId);
    if (connections && connections.size > 0) {
        const message = JSON.stringify({
            type: 'notification',
            data: notification
        });

        connections.forEach(ws => {
            try {
                ws.send(message);
            } catch (err) {
                console.error(`Error sending notification to user ${userId}:`, err);
            }
        });

        return true; // notification was sent
    }
    return false; // user not connected
}

/**
 * Broadcast notification to multiple users
 */
function broadcastNotification(userIds, notification) {
    const delivered = [];
    userIds.forEach(userId => {
        if (sendNotificationToUser(userId, notification)) {
            delivered.push(userId);
        }
    });
    return delivered;
}

/**
 * Get count of online users
 */
function getOnlineUsersCount() {
    return notificationConnections.size;
}

/**
 * Check if a user is online
 */
function isUserOnline(userId) {
    return notificationConnections.has(userId) && notificationConnections.get(userId).size > 0;
}

module.exports = {
    registerNotificationConnection,
    unregisterNotificationConnection,
    sendNotificationToUser,
    broadcastNotification,
    getOnlineUsersCount,
    isUserOnline,
    notificationConnections
};
