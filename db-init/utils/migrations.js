const runMigrations = async (db) => {
    console.log('🔄 Running simple migrations...');
    
    // Add gaming stats/profile columns to users table if they don't exist
    const gamingColumns = [
        { name: 'player_level', type: 'INTEGER DEFAULT 1' },
        { name: 'experience_points', type: 'INTEGER DEFAULT 0' },
        { name: 'rank_points', type: 'INTEGER DEFAULT 0' },
        { name: 'rank_tier', type: 'TEXT DEFAULT "Bronze"' },
        { name: 'games_played', type: 'INTEGER DEFAULT 0' },
        { name: 'games_won', type: 'INTEGER DEFAULT 0' },
        { name: 'games_lost', type: 'INTEGER DEFAULT 0' },
        { name: 'win_rate', type: 'REAL DEFAULT 0.0' },
        { name: 'current_streak', type: 'INTEGER DEFAULT 0' },
        { name: 'profile_pic', type: 'TEXT' },
        { name: 'avatar_updated_at', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of gamingColumns) {
        await new Promise((resolve, reject) => {
            // Check if column exists
            db.all(`PRAGMA table_info(users)`, (err, columns) => {
                if (err) return reject(err);
                
                const columnExists = columns.some(col => col.name === column.name);
                if (!columnExists) {
                    console.log(`➕ Adding column ${column.name} to users table`);
                    db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`, (err) => {
                        if (err) {
                            console.error(`❌ Error adding column ${column.name}:`, err);
                            reject(err);
                        } else {
                            console.log(`✅ Added column ${column.name}`);
                            resolve();
                        }
                    });
                } else {
                    console.log(`✅ Column ${column.name} already exists`);
                    resolve();
                }
            });
        });
    }
    
    // Add player2 rank columns to match_history table if they don't exist
    const player2Columns = [
        { name: 'player2_rank_before', type: 'INTEGER DEFAULT 0' },
        { name: 'player2_rank_after', type: 'INTEGER DEFAULT 0' },
        { name: 'player2_points_change', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of player2Columns) {
        await new Promise((resolve, reject) => {
            // Check if column exists
            db.all(`PRAGMA table_info(match_history)`, (err, columns) => {
                if (err) return reject(err);
                
                const columnExists = columns.some(col => col.name === column.name);
                if (!columnExists) {
                    console.log(`➕ Adding column ${column.name} to match_history table`);
                    db.run(`ALTER TABLE match_history ADD COLUMN ${column.name} ${column.type}`, (err) => {
                        if (err) {
                            console.error(`❌ Error adding column ${column.name}:`, err);
                            reject(err);
                        } else {
                            console.log(`✅ Added column ${column.name}`);
                            resolve();
                        }
                    });
                } else {
                    console.log(`✅ Column ${column.name} already exists`);
                    resolve();
                }
            });
        });
    }

    // Add player3 and player4 rank columns to match_history table for quad pong
    const player34Columns = [
        { name: 'player3_rank_before', type: 'INTEGER DEFAULT 0' },
        { name: 'player3_rank_after', type: 'INTEGER DEFAULT 0' },
        { name: 'player3_points_change', type: 'INTEGER DEFAULT 0' },
        { name: 'player4_rank_before', type: 'INTEGER DEFAULT 0' },
        { name: 'player4_rank_after', type: 'INTEGER DEFAULT 0' },
        { name: 'player4_points_change', type: 'INTEGER DEFAULT 0' }
    ];

    for (const column of player34Columns) {
        await new Promise((resolve, reject) => {
            // Check if column exists
            db.all(`PRAGMA table_info(match_history)`, (err, columns) => {
                if (err) return reject(err);
                
                const columnExists = columns.some(col => col.name === column.name);
                if (!columnExists) {
                    console.log(`➕ Adding column ${column.name} to match_history table`);
                    db.run(`ALTER TABLE match_history ADD COLUMN ${column.name} ${column.type}`, (err) => {
                        if (err) {
                            console.error(`❌ Error adding column ${column.name}:`, err);
                            reject(err);
                        } else {
                            console.log(`✅ Added column ${column.name}`);
                            resolve();
                        }
                    });
                } else {
                    console.log(`✅ Column ${column.name} already exists`);
                    resolve();
                }
            });
        });
    }

    await new Promise((resolve, reject) => {
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'", (err, row) => {
            if (err) return reject(err);

            const ddl = row?.sql || '';
            if (ddl.includes("'message'")) {
                console.log('✅ Notifications table already supports message type');
                return resolve();
            }

            console.log("🔄 Updating notifications table to allow 'message' type");

            const steps = [
                "PRAGMA foreign_keys=off",
                "BEGIN TRANSACTION",
                "ALTER TABLE notifications RENAME TO notifications_old",
                `CREATE TABLE notifications (
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
                )`,
                `INSERT INTO notifications (
                    id, recipient_id, sender_id, type, title, message, data, is_read, is_dismissed, read_at, dismissed_at, created_at, expires_at
                )
                SELECT
                    id, recipient_id, sender_id,
                    CASE
                        WHEN type IN ('match_invite', 'friend_request', 'friend_accept', 'tournament_invite', 'system', 'message') THEN type
                        ELSE 'system'
                    END AS type,
                    title, message, data, is_read, is_dismissed, read_at, dismissed_at, created_at, expires_at
                FROM notifications_old`,
                "DROP TABLE notifications_old",
                "COMMIT",
                "PRAGMA foreign_keys=on"
            ];

            const runNext = (index = 0) => {
                if (index >= steps.length) return resolve();
                db.run(steps[index], (stepErr) => {
                    if (stepErr) return reject(stepErr);
                    runNext(index + 1);
                });
            };

            runNext();
        });
    });
    
    console.log('✅ Migrations complete');
};

module.exports = { runMigrations };