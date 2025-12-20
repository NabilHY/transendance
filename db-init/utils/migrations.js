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
    
    console.log('✅ Migrations complete');
};

module.exports = { runMigrations };