const initializeDatabase = (db) => {
    return new Promise((resolve, reject) => {
        console.log('🔄 Initializing unified database schema...');
        
        // Enable foreign keys and WAL mode
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) return reject(err);
            
            db.run('PRAGMA journal_mode = WAL', (err) => {
                if (err) return reject(err);
                // Create unified users table (combines auth + profile data)
                db.run(`CREATE TABLE IF NOT EXISTS users (
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
                        last_password_changed_at INTEGER,
                        account_locked INTEGER DEFAULT 0,
                        
                        failed_login_attempts INTEGER DEFAULT 0,
                        
                        -- Profile fields (from user_profiles)
                        profile_completed INTEGER DEFAULT 0,
                        username TEXT UNIQUE,
                        first_name TEXT,
                        last_name TEXT,
                        profile_pic TEXT,
                        is_online INTEGER DEFAULT 0,
                        updated_at TEXT DEFAULT (datetime('now')),
                        
                        -- Gaming/Progression fields
                        player_level INTEGER DEFAULT 1,
                        experience_points INTEGER DEFAULT 0,
                        rank_points INTEGER DEFAULT 0,
                        rank_tier TEXT DEFAULT 'Bronze',
                        games_played INTEGER DEFAULT 0,
                        games_won INTEGER DEFAULT 0,
                        games_lost INTEGER DEFAULT 0,
                        win_rate REAL DEFAULT 0.0,
                        current_streak INTEGER DEFAULT 0
                    )
                `, (err) => {
                    if (err) return reject(err);
                    
                    // Create auth service tables
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
                                ALTER TABLE email_verification_tokens
                                ADD COLUMN new_email TEXT
                            `, (err) => {
                                if (err && !err.message.includes('duplicate column name') && !err.message.includes('no such column')) {
                                    console.warn('Could not add new_email column (may already exist):', err.message);
                                }
                            });

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

                                // Create account lockouts table (moved from auth-backend)
                                db.run(`
                                    CREATE TABLE IF NOT EXISTS account_lockouts (
                                        identifier TEXT PRIMARY KEY,
                                        failed_attempts INTEGER DEFAULT 0,
                                        first_attempt INTEGER,
                                        locked_until INTEGER,
                                        created_at INTEGER DEFAULT (strftime('%s', 'now')),
                                        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
                                    )
                                `, (err) => {
                                    if (err) return reject(err);

                                    // Create friends table (references users.id instead of user_profiles.user_id)
                                    db.run(`
                                        CREATE TABLE IF NOT EXISTS friends (
                                            id TEXT PRIMARY KEY,
                                            user_id INTEGER NOT NULL,
                                            friend_id INTEGER NOT NULL,
                                            status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
                                            created_at TEXT DEFAULT (datetime('now')),
                                            FOREIGN KEY (user_id) REFERENCES users(id),
                                            FOREIGN KEY (friend_id) REFERENCES users(id)
                                        )
                                    `, (err) => {
                                        if (err) return reject(err);

                                        // Create match_history table for game tracking
                                        db.run(`
                                            CREATE TABLE IF NOT EXISTS match_history (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                game_type TEXT NOT NULL CHECK(game_type IN ('solo', 'ai', 'matchmaking', 'tournament', 'quad')),
                                                player1_id INTEGER NOT NULL,
                                                player2_id INTEGER,
                                                player3_id INTEGER,
                                                player4_id INTEGER,
                                                winner_id INTEGER NOT NULL,
                                                score_player1 INTEGER NOT NULL DEFAULT 0,
                                                score_player2 INTEGER NOT NULL DEFAULT 0,
                                                tournament_stage TEXT CHECK(tournament_stage IN ('quarter', 'semi', 'final', NULL)),
                                                game_duration INTEGER DEFAULT 0,
                                                player1_rank_before INTEGER DEFAULT 0,
                                                player1_rank_after INTEGER DEFAULT 0,
                                                player1_points_change INTEGER DEFAULT 0,
                                                player2_rank_before INTEGER DEFAULT 0,
                                                player2_rank_after INTEGER DEFAULT 0,
                                                player2_points_change INTEGER DEFAULT 0,
                                                player3_rank_before INTEGER DEFAULT 0,
                                                player3_rank_after INTEGER DEFAULT 0,
                                                player3_points_change INTEGER DEFAULT 0,
                                                player4_rank_before INTEGER DEFAULT 0,
                                                player4_rank_after INTEGER DEFAULT 0,
                                                player4_points_change INTEGER DEFAULT 0,
                                                created_at TEXT DEFAULT (datetime('now')),
                                                FOREIGN KEY (player1_id) REFERENCES users(id),
                                                FOREIGN KEY (player2_id) REFERENCES users(id),
                                                FOREIGN KEY (player3_id) REFERENCES users(id),
                                                FOREIGN KEY (player4_id) REFERENCES users(id),
                                                FOREIGN KEY (winner_id) REFERENCES users(id)
                                            )
                                        `, (err) => {
                                            if (err) return reject(err);

                                            // Create all indexes
                                            const indexes = [
                                                'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL',
                                                'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)',
                                                'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at)',
                                                'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)',
                                                'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
                                                'CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online)',
                                                'CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_player1 ON match_history(player1_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_player2 ON match_history(player2_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_player3 ON match_history(player3_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_player4 ON match_history(player4_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_winner ON match_history(winner_id)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_type ON match_history(game_type)',
                                                'CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at)'
                                            ];
                                            
                                            let indexCount = 0;
                                            const createNextIndex = () => {
                                                if (indexCount >= indexes.length) {
                                                    console.log('✅ Database schema initialized successfully');
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
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

module.exports = { initializeDatabase };
