#!/usr/bin/env node
// reset-player-stats.js - Reset all player statistics to default values

const Database = require('better-sqlite3');
const path = require('path');

/**
 * Reset all player stats to their default starting values
 */
function resetAllPlayerStats() {
    try {
        // Connect to the shared SQLite database
        const dbPath = process.env.DATABASE_PATH || '/usr/src/app/db/shared.sqlite';
        console.log(`🎮 Connecting to database at: ${dbPath}`);
        
        const db = new Database(dbPath);
        
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
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
                rank_points = 1000,
                rank_tier = 'Bronze'
            WHERE id IS NOT NULL
        `;
        
        const result = db.prepare(resetQuery).run();
        
        console.log(`✅ Successfully reset stats for ${result.changes} players!`);
        console.log('📊 All players now have:');
        console.log('   - Games Played: 0');
        console.log('   - Games Won: 0');
        console.log('   - Games Lost: 0');
        console.log('   - Win Rate: 0%');
        console.log('   - Current Streak: 0');
        console.log('   - Player Level: 1');
        console.log('   - Experience Points: 0');
        console.log('   - Rank Points: 1000');
        console.log('   - Rank Tier: Bronze');
        
        // Verify by showing a few users
        console.log('\n🔍 Verification - First 5 users:');
        const users = db.prepare(`
            SELECT id, username, games_played, games_won, player_level, 
                   experience_points, rank_points, rank_tier 
            FROM users 
            LIMIT 5
        `).all();
        
        users.forEach(user => {
            console.log(`   ${user.username}: Level ${user.player_level}, ${user.rank_points}RP (${user.rank_tier}), ${user.games_played} games`);
        });
        
        db.close();
        console.log('\n✨ Database closed. All done!');
        
    } catch (error) {
        console.error('❌ Error resetting player stats:', error);
        process.exit(1);
    }
}

// Run the reset
resetAllPlayerStats();
