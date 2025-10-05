const initializeDatabase = (db) => {
    try {
        // Create user profiles table (references auth service users by ID)
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                username TEXT UNIQUE,
                first_name TEXT,
                last_name TEXT,
                profile_pic TEXT,
                is_online INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Create friends table
        db.exec(`
            CREATE TABLE IF NOT EXISTS friends (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
                FOREIGN KEY (friend_id) REFERENCES user_profiles(user_id)
            )
        `);

        // Create indexes
        db.exec(`CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)`);
        
        console.log('Database schema initialized successfully');
    } catch (err) {
        console.error('Database initialization error:', err);
        throw err;
    }
};

module.exports = { initializeDatabase };
