const initializeNotifications = (db) => {
    return new Promise((resolve, reject) => {
        console.log('🔔 Initializing notifications table...');
        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_id INTEGER NOT NULL,
                sender_id INTEGER,
                type TEXT NOT NULL CHECK(type IN ('match_invite', 'friend_request', 'friend_accept', 'tournament_invite', 'system', 'message')) DEFAULT 'system',
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                data JSON,
                is_read INTEGER DEFAULT 0,
                is_dismissed INTEGER DEFAULT 0,
                read_at INTEGER,
                dismissed_at INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                expires_at INTEGER,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) return reject(err);
            console.log('✅ Notifications table created');

            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)',
                'CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read) WHERE is_read = 0',
                'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)',
                'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at)'
            ];

            let indexCount = 0;
            const createNextIndex = () => {
                if (indexCount >= indexes.length) {
                    console.log('✅ Notification indexes created');
                    resolve();
                    return;
                }

                db.run(indexes[indexCount], (err) => {
                    if (err) return reject(err);
                    indexCount++;
                    createNextIndex();
                });
            };

            createNextIndex();
        });
    });
};

module.exports = { initializeNotifications };
