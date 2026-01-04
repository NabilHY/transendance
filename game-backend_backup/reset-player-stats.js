#!/usr/bin/env node
// reset-player-stats.js - Reset all player statistics to default values

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Reset all player stats to their default starting values
 */
function resetAllPlayerStats() {
    // Connect to the shared SQLite database
    const dbPath = process.env.DATABASE_PATH || '/usr/src/app/db/shared.sqlite';
    console.log(`🎮 Connecting to database at: ${dbPath}`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error connecting to database:', err);
            process.exit(1);
        }
        console.log('✅ Connected to database');
    });
    
    console.log('🔄 Resetting all player statistics to default values...');
    
    // Reset all game stats to default values
    const resetQuery = `
        UPDATE users 
        SET 
            games_played = 0,
            games_won = 0,
            games_lost = 0,
            win_rate = 0.0,
            current_streak = 0,
            player_level = 1,
            experience_points = 0,
            rank_points = 0,
            rank_tier = 'Bronze'
        WHERE id IS NOT NULL
    `;
    
    db.run(resetQuery, function(err) {
        if (err) {
            console.error('❌ Error resetting stats:', err);
            db.close();
            process.exit(1);
        }
        
        console.log(`✅ Successfully reset stats for ${this.changes} players!`);
        console.log('📊 All players now have:');
        console.log('   - Games Played: 0');
        console.log('   - Games Won: 0');
        console.log('   - Games Lost: 0');
        console.log('   - Win Rate: 0%');
        console.log('   - Current Streak: 0');
        console.log('   - Player Level: 1');
        console.log('   - Experience Points: 0');
        console.log('   - Rank Points: 0');
        console.log('   - Rank Tier: Bronze');
        
        // Verify by showing a few users
        console.log('\n🔍 Verification - First 5 users:');
        db.all(`
            SELECT id, username, games_played, games_won, player_level, 
                   experience_points, rank_points, rank_tier 
            FROM users 
            LIMIT 5
        `, [], (err, users) => {
            if (err) {
                console.error('❌ Error querying users:', err);
            } else {
                users.forEach(user => {
                    console.log(`   ${user.username}: Level ${user.player_level}, ${user.rank_points}RP (${user.rank_tier}), ${user.games_played} games`);
                });
            }
            
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                } else {
                    console.log('\n✨ Database closed. All done!');
                }
            });
        });
    });
}

// Run the reset
resetAllPlayerStats();
