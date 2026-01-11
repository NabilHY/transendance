/**
 * Add XP to a player and automatically update their level
 * Usage: node add-xp.js <username> <xp_amount>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const PlayerProgression = require('./PlayerProgression');

const DB_PATH = process.env.USERS_DB_PATH || path.join(__dirname, 'db', 'shared.sqlite');

const username = process.argv[2];
const xpToAdd = parseInt(process.argv[3]);

if (!username || !xpToAdd || isNaN(xpToAdd)) {
    console.error('❌ Usage: node add-xp.js <username> <xp_amount>');
    console.error('   Example: node add-xp.js bunda1 500');
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
    }
});

const progression = new PlayerProgression();

// Get current user data
db.get('SELECT id, username, experience_points, player_level FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
        console.error('❌ Error fetching user:', err);
        db.close();
        process.exit(1);
    }

    if (!user) {
        console.error(`❌ User '${username}' not found`);
        db.close();
        process.exit(1);
    }

    const currentXP = user.experience_points || 0;
    const newXP = currentXP + xpToAdd;
    
    // Calculate new level
    const levelInfo = progression.calculateLevel(newXP);
    
    console.log(`\n🎮 Adding XP to ${username}:`);
    console.log(`   Current XP: ${currentXP}`);
    console.log(`   Adding: +${xpToAdd} XP`);
    console.log(`   New XP: ${newXP}`);
    console.log(`   Current Level: ${user.player_level}`);
    console.log(`   New Level: ${levelInfo.level}`);
    
    if (levelInfo.level > user.player_level) {
        console.log(`   🎉 LEVEL UP! ${user.player_level} → ${levelInfo.level}`);
    }
    
    // Update database
    db.run(
        'UPDATE users SET experience_points = ?, player_level = ? WHERE id = ?',
        [newXP, levelInfo.level, user.id],
        function(updateErr) {
            if (updateErr) {
                console.error('❌ Error updating user:', updateErr);
                db.close();
                process.exit(1);
            }
            
            console.log(`\n✅ Successfully updated ${username}!`);
            console.log(`   Final Stats: Level ${levelInfo.level}, ${newXP} XP\n`);
            
            db.close();
            process.exit(0);
        }
    );
});
