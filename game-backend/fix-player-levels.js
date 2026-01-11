/**
 * Migration script to recalculate player levels based on current XP
 * This fixes the issue where players have XP but are stuck at level 1
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Import the PlayerProgression system
const PlayerProgression = require('./PlayerProgression');

const DB_PATH = process.env.USERS_DB_PATH || path.join(__dirname, 'db', 'shared.sqlite');

async function fixPlayerLevels() {
    console.log('🔧 Starting player level migration...');
    console.log(`📁 Database path: ${DB_PATH}`);

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err);
            process.exit(1);
        }
    });

    const progression = new PlayerProgression();

    // Get all users with their current XP
    db.all('SELECT id, username, experience_points, player_level FROM users', [], (err, users) => {
        if (err) {
            console.error('❌ Error fetching users:', err);
            db.close();
            process.exit(1);
        }

        console.log(`\n👥 Found ${users.length} users to process\n`);

        let processed = 0;
        let updated = 0;

        users.forEach((user) => {
            const currentXP = user.experience_points || 0;
            const currentLevel = user.player_level || 1;
            
            // Calculate what level they should be
            const levelInfo = progression.calculateLevel(currentXP);
            const correctLevel = levelInfo.level;

            if (currentLevel !== correctLevel) {
                console.log(`📊 ${user.username} (ID: ${user.id}): ${currentXP} XP → Level ${currentLevel} to ${correctLevel}`);
                
                // Update the user's level
                db.run(
                    'UPDATE users SET player_level = ? WHERE id = ?',
                    [correctLevel, user.id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error(`❌ Error updating ${user.username}:`, updateErr);
                        } else {
                            updated++;
                        }
                        
                        processed++;
                        
                        // Check if we're done
                        if (processed === users.length) {
                            console.log(`\n✅ Migration complete!`);
                            console.log(`📊 Updated ${updated} users with correct levels`);
                            console.log(`📊 ${users.length - updated} users already had correct levels\n`);
                            db.close();
                            process.exit(0);
                        }
                    }
                );
            } else {
                console.log(`✓ ${user.username} (ID: ${user.id}): Level ${currentLevel} is correct for ${currentXP} XP`);
                processed++;
                
                // Check if we're done
                if (processed === users.length) {
                    console.log(`\n✅ Migration complete!`);
                    console.log(`📊 Updated ${updated} users with correct levels`);
                    console.log(`📊 ${users.length - updated} users already had correct levels\n`);
                    db.close();
                    process.exit(0);
                }
            }
        });

        // Handle case where there are no users
        if (users.length === 0) {
            console.log('No users found in database');
            db.close();
            process.exit(0);
        }
    });
}

// Run the migration
fixPlayerLevels();
