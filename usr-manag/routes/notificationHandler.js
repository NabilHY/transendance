const notificationConnections = new Map();

function normalizeUserId(userId) {
    const asNumber = Number(userId);
    return Number.isNaN(asNumber) ? userId : asNumber;
}

function registerNotificationConnection(userId, ws) {
    const id = normalizeUserId(userId);
    if (!notificationConnections.has(id)) {
        notificationConnections.set(id, new Set());
    }
    notificationConnections.get(id).add(ws);
    console.log(`✅ Notification connection registered for user ${id}`);
}

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

        return true;
    }
    return false;
}

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

function getOnlineUsersCount() {
    return notificationConnections.size;
}

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
