/**
 * Migration Script: Add game_status Column
 * 
 * This migration adds a game_status column to the users table with the following behavior:
 * - Possible values: 'offline', 'online', 'in_queue', 'in_game', 'in_tournament'
 * - Default value: 'offline'
 * - Automatic constraint: When is_online = 0, game_status is automatically set to 'offline' via trigger
 * - When is_online = 1, game_status can be any valid status (default 'online')
 * 
 * Created: 2025-12-22
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || '/usr/src/app/db/shared.sqlite';

async function runMigration() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to database');
        });

        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        console.log('\n🔄 Starting game_status migration...\n');

        // Step 1: Check if column already exists
        db.all(`PRAGMA table_info(users)`, (err, columns) => {
            if (err) {
                console.error('❌ Error checking table info:', err);
                db.close();
                reject(err);
                return;
            }

            const columnExists = columns.some(col => col.name === 'game_status');
            
            if (columnExists) {
                console.log('✅ game_status column already exists');
                db.close();
                resolve();
                return;
            }

            console.log('➕ Adding game_status column...');

            // Step 2: Add the column
            db.run(`ALTER TABLE users ADD COLUMN game_status TEXT DEFAULT 'offline'`, (err) => {
                if (err) {
                    console.error('❌ Error adding game_status column:', err);
                    db.close();
                    reject(err);
                    return;
                }

                console.log('✅ Added game_status column');

                // Step 3: Update existing users based on is_online status
                console.log('🔄 Updating existing users game_status...');
                db.run(`UPDATE users SET game_status = CASE 
                    WHEN is_online = 1 THEN 'online' 
                    ELSE 'offline' 
                END`, (err) => {
                    if (err) {
                        console.error('❌ Error updating game_status values:', err);
                        db.close();
                        reject(err);
                        return;
                    }

                    console.log('✅ Updated game_status for existing users');

                    // Step 4: Drop old trigger if exists
                    console.log('🔄 Creating database trigger...');
                    db.run(`DROP TRIGGER IF EXISTS enforce_game_status_on_offline`, (err) => {
                        if (err) {
                            console.error('⚠️ Warning dropping old trigger:', err);
                        }

                        // Step 5: Create trigger to enforce game_status logic
                        db.run(`
                            CREATE TRIGGER IF NOT EXISTS enforce_game_status_on_offline
                            AFTER UPDATE OF is_online ON users
                            FOR EACH ROW
                            WHEN NEW.is_online = 0
                            BEGIN
                                UPDATE users SET game_status = 'offline' WHERE id = NEW.id;
                            END
                        `, (err) => {
                            if (err) {
                                console.error('❌ Error creating trigger:', err);
                                db.close();
                                reject(err);
                                return;
                            }

                            console.log('✅ Created trigger: enforce_game_status_on_offline');
                            console.log('\n✅ Migration completed successfully!\n');
                            
                            // Step 6: Verify the migration
                            db.all(`PRAGMA table_info(users)`, (err, columns) => {
                                if (err) {
                                    console.error('⚠️ Warning verifying migration:', err);
                                } else {
                                    const gameStatusCol = columns.find(col => col.name === 'game_status');
                                    if (gameStatusCol) {
                                        console.log('✅ Verification: game_status column exists');
                                        console.log('   Column details:', gameStatusCol);
                                    }
                                }

                                // Check trigger
                                db.all(`SELECT name FROM sqlite_master WHERE type='trigger' AND name='enforce_game_status_on_offline'`, (err, triggers) => {
                                    if (err) {
                                        console.error('⚠️ Warning checking triggers:', err);
                                    } else if (triggers && triggers.length > 0) {
                                        console.log('✅ Verification: Trigger exists');
                                    }

                                    db.close();
                                    resolve();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

// Run the migration
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('\n🎉 Migration script completed');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Migration failed:', err);
            process.exit(1);
        });
}

module.exports = { runMigration };
