/**
 * WebSocket Notification Handler
 * Broadcasts notifications to connected users in real-time
 */

const notificationConnections = new Map(); // userId -> Set of WebSocket connections

// Normalize user identifier to avoid number/string key mismatches in the map
function normalizeUserId(userId) {
    const asNumber = Number(userId);
    return Number.isNaN(asNumber) ? userId : asNumber;
}

/**
 * Register a user's WebSocket connection for notifications
 */
function registerNotificationConnection(userId, ws) {
    const id = normalizeUserId(userId);
    if (!notificationConnections.has(id)) {
        notificationConnections.set(id, new Set());
    }
    notificationConnections.get(id).add(ws);
    console.log(`✅ Notification connection registered for user ${id}`);
}

/**
 * Unregister a user's WebSocket connection
 */
function unregisterNotificationConnection(userId, ws) {
    const id = normalizeUserId(userId);
    const connections = notificationConnections.get(id);
    if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
            notificationConnections.delete(id);
        }
    }
}

/**
 * Send a notification to a user through WebSocket if they're connected
 */
function sendNotificationToUser(userId, notification) {
    const id = normalizeUserId(userId);
    const connections = notificationConnections.get(id);
    console.log("keeeys: ", Array.from(notificationConnections.keys()));
    console.log("resolved id: ", id, "connections: ", connections);

    if (connections) {
        const message = JSON.stringify({
            type: 'notification',
            data: notification
        });

        connections.forEach(ws => {
            try {
                ws.send(message);
            } catch (err) {
                console.error(`Error sending notification to user ${id}:`, err);
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
        const id = normalizeUserId(userId);
        if (sendNotificationToUser(id, notification)) {
            delivered.push(id);
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
    const id = normalizeUserId(userId);
    return notificationConnections.has(id) && notificationConnections.get(id).size > 0;
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
