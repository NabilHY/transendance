const initializeDatabase = (db) => {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                twofa_secret TEXT,
                twofa_enabled INTEGER DEFAULT 0,
                twofa_confirmed INTEGER DEFAULT 0,
                google_id TEXT,
                name TEXT,
                avatar_url TEXT,
                is_verified INTEGER DEFAULT 0,
                last_password_changed_at INTEGER
            )
        `, (err) => {
            if (err) return reject(err);

            // Indexes
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`, () => {});

            // Tables
            db.run(`
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) return reject(err);
                db.run(`
                    CREATE TABLE IF NOT EXISTS email_verification_tokens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        token TEXT UNIQUE NOT NULL,
                        user_id INTEGER NOT NULL,
                        expires_at INTEGER NOT NULL,
                        created_at INTEGER DEFAULT (strftime('%s', 'now')),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) return reject(err);
                    db.run(`
                        CREATE TABLE IF NOT EXISTS password_reset_tokens (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            token TEXT UNIQUE NOT NULL,
                            user_id INTEGER NOT NULL,
                            expires_at INTEGER NOT NULL,
                            used_at INTEGER,
                            created_at INTEGER DEFAULT (strftime('%s', 'now')),
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        )
                    `, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            });
        });
    });
};

module.exports = { initializeDatabase };


