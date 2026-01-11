const PlayerProgression = require('./PlayerProgression');

class GameStatsHandler {
    constructor(userAuth) {
        this.userAuth = userAuth;
        this.progression = new PlayerProgression();
        // Track processed games to prevent duplicates at the stats handler level
        this.processedGames = new Set();
    }
    
    /**
     * Generate a unique game key for duplicate detection
     * @param {object} gameResult - Game result data
     * @returns {string} Unique key for this game
     */
    generateGameKey(gameResult) {
        const { player1Id, player2Id, player1Score, player2Score, gameMode, gameDuration } = gameResult;
        // Create a unique key based on players, scores, mode, and duration
        // This ensures we can identify the exact same game being processed multiple times
        return `${gameMode}_${player1Id}_${player2Id}_${player1Score}_${player2Score}_${gameDuration}`;
    }

    /**
     * Process game completion and update player statistics
     * @param {object} gameResult - Game completion data
     * @param {number} gameResult.player1Id - Player 1 user ID
     * @param {number} gameResult.player2Id - Player 2 user ID (null for AI/solo)
     * @param {number} gameResult.player1Score - Player 1 final score
     * @param {number} gameResult.player2Score - Player 2 final score
     * @param {string} gameResult.gameMode - Game mode (matchmaking, ai, solo)
     * @param {string} gameResult.aiDifficulty - AI difficulty if applicable
     * @param {number} gameResult.gameDuration - Game duration in seconds
     * @param {string} gameResult.tournamentStage - Tournament stage if applicable
     */
    async processGameCompletion(gameResult) {
        const { 
            player1Id, 
            player2Id, 
            player1Score, 
            player2Score, 
            gameMode = 'matchmaking',
            aiDifficulty = null,
            gameDuration = 0,
            tournamentStage = null
        } = gameResult;

        // ============================================
        // DUPLICATE PREVENTION - CHECK FIRST!
        // ============================================
        const gameKey = this.generateGameKey(gameResult);
        
        if (this.processedGames.has(gameKey)) {
            console.log(`⚠️ [STATS HANDLER] Game already processed: ${gameKey} - SKIPPING DUPLICATE`);
            return; // Exit early - this exact game was already processed
        }
        
        console.log(`🏆 Processing game completion: P1(${player1Id}): ${player1Score} vs P2(${player2Id}): ${player2Score} [Key: ${gameKey}]`);

        try {
            // Mark as processing IMMEDIATELY to prevent race conditions
            this.processedGames.add(gameKey);
            console.log(`🔒 [STATS HANDLER] Game marked as processing: ${gameKey}`);
            
            // Get current player stats BEFORE any updates
            const player1StatsBefore = await this.getUserStats(player1Id);
            const player2StatsBefore = player2Id ? await this.getUserStats(player2Id) : null;

            // Determine winner - no draws, someone must win
            let player1Won = player1Score > player2Score;
            let player2Won = player2Score > player1Score;
            
            // If scores are tied, player 1 wins (could also randomize this)
            if (player1Score === player2Score) {
                player1Won = true;
                player2Won = false;
            }

            console.log(`🎯 Game result: P1 won: ${player1Won}, P2 won: ${player2Won}`);

            // Calculate rewards BEFORE updating (for match history)
            const player1Rewards = this.progression.calculateGameRewards(
                player1Won, 
                true, // isRanked 
                player1StatsBefore.current_streak || 0
            );
            
            const player2Rewards = player2StatsBefore ? this.progression.calculateGameRewards(
                player2Won, 
                true, // isRanked 
                player2StatsBefore.current_streak || 0
            ) : null;

            // Update Player 1
            const player1Result = await this.updatePlayerStats(
                player1Id, 
                player1StatsBefore, 
                player1Won, 
                gameMode
            );

            // Update Player 2 (if not AI/solo)
            let player2Result = null;
            if (player2Id && player2StatsBefore) {
                player2Result = await this.updatePlayerStats(
                    player2Id, 
                    player2StatsBefore, 
                    player2Won, 
                    gameMode
                );
            }

            // Log game to history with the before/after stats we already calculated
            await this.logGameHistory({
                player1Id,
                player2Id,
                player1Score,
                player2Score,
                gameMode,
                aiDifficulty,
                gameDuration,
                tournamentStage,
                winner: player1Won ? player1Id : player2Id,
                // Pass the stats we already have
                player1RankBefore: player1StatsBefore.rank_points || 0,
                player1RankAfter: player1Result.newStats.rankPoints,
                player1PointsChange: player1Rewards.rankPoints,
                player2RankBefore: player2StatsBefore ? (player2StatsBefore.rank_points || 0) : null,
                player2RankAfter: player2Result ? player2Result.newStats.rankPoints : null,
                player2PointsChange: player2Rewards ? player2Rewards.rankPoints : null
            });

            console.log(`✅ Game stats updated successfully for ${gameKey}`);

        } catch (error) {
            console.error(`❌ Error processing game completion for ${gameKey}:`, error);
            // Remove from processed set on error so it can be retried
            this.processedGames.delete(gameKey);
            throw error;
        }
    }

    /**
     * Get current user statistics
     * @param {number} userId - User ID
     * @returns {object} Current user stats
     */
    async getUserStats(userId) {
        return new Promise((resolve, reject) => {
            const db = this.userAuth.getDb();
            const query = `
                SELECT 
                    id, email, username, 
                    player_level, experience_points, rank_points, rank_tier,
                    games_played, games_won, games_lost, win_rate, current_streak
                FROM users 
                WHERE id = ?
            `;
            
            db.get(query, [userId], (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                } else if (!row) {
                    reject(new Error(`User ${userId} not found`));
                } else {
                    resolve(row);
                }
            });
        });
    }

    /**
     * Update player statistics after a game
     * @param {number} userId - User ID
     * @param {object} currentStats - Current player stats
     * @param {boolean} won - Whether player won
     * @param {string} gameMode - Game mode
     */
    async updatePlayerStats(userId, currentStats, won, gameMode) {
        const gameOutcome = won ? 'win' : 'loss';
        
        // Calculate rewards using the simplified method signature
        const rewards = this.progression.calculateGameRewards(
            won, 
            true, // isRanked 
            currentStats.current_streak || 0
        );

        // Update game counts
        const newGamesPlayed = currentStats.games_played + 1;
        const newGamesWon = currentStats.games_won + (won ? 1 : 0);
        const newGamesLost = currentStats.games_lost + (won ? 0 : 1);

        // Calculate new values
        const newExperience = currentStats.experience_points + rewards.experience;
        const newRankPoints = this.progression.clampRankPoints((currentStats.rank_points || 0) + rewards.rankPoints);
        const newStreak = this.progression.updateStreak(currentStats.current_streak || 0, won);
        
        // Get rank info from the updated rank points
        const rankInfo = this.progression.getRankInfo(newRankPoints);
        
        // Calculate player level based on experience points
        const levelInfo = this.progression.calculateLevel(newExperience);
        
        // Calculate win rate
        const winRate = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed * 100) : 0;

        console.log(`📊 ${currentStats.username || 'User'} stats update:`, {
            outcome: gameOutcome,
            experienceGained: rewards.experience,
            rankPointsChange: rewards.rankPoints,
            newExperience: newExperience,
            newLevel: levelInfo.level,
            newRankPoints: newRankPoints,
            newRank: `${rankInfo.tier} ${rankInfo.level}`,
            newStreak: newStreak,
            winRate: Math.round(winRate * 100) / 100
        });

        // Update database
        const updateQuery = `
            UPDATE users SET 
                player_level = ?,
                experience_points = ?,
                rank_points = ?,
                rank_tier = ?,
                games_played = ?,
                games_won = ?,
                games_lost = ?,
                win_rate = ?,
                current_streak = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `;

        const params = [
            levelInfo.level,
            newExperience,
            newRankPoints,
            `${rankInfo.tier} ${rankInfo.level}`,
            newGamesPlayed,
            newGamesWon,
            newGamesLost,
            Math.round(winRate * 100) / 100,
            newStreak,
            userId
        ];

        return new Promise((resolve, reject) => {
            const db = this.userAuth.getDb();
            
            console.log(`🔧 DEBUG: About to update user ${userId} with:`, {
                newGamesPlayed,
                newGamesWon, 
                newGamesLost,
                newExperience,
                newRankPoints,
                winRate: Math.round(winRate * 100) / 100
            });
            
            db.run(updateQuery, params, function(err) {
                if (err) {
                    console.error(`❌ Database update error for user ${userId}:`, err);
                    db.close();
                    reject(err);
                } else {
                    console.log(`📊 Database update result for user ${userId}: ${this.changes} rows changed`);
                    if (this.changes === 0) {
                        console.warn(`⚠️ No rows were updated for user ${userId} - user may not exist!`);
                    }
                    db.close();
                    console.log(`✅ Updated stats for user ${userId}`);
                    resolve({
                        changes: this.changes,
                        newStats: {
                            level: 1,
                            experience: newExperience,
                            rankPoints: newRankPoints,
                            rank: `${rankInfo.tier} ${rankInfo.level}`,
                            gamesPlayed: newGamesPlayed,
                            gamesWon: newGamesWon,
                            gamesLost: newGamesLost,
                            winRate: Math.round(winRate * 100) / 100,
                            streak: newStreak
                        }
                    });
                }
            });
        });
    }

    /**
     * Log completed game to history
     * @param {object} gameData - Game completion data with pre-calculated stats
     */
    async logGameHistory(gameData) {
        try {
            const {
                player1Id,
                player2Id,
                player3Id = null,
                player4Id = null,
                player1Score,
                player2Score,
                gameMode,
                gameDuration = 0,
                winner,
                tournamentStage = null,
                // Pre-calculated stats passed from processGameCompletion
                player1RankBefore = 0,
                player1RankAfter = 0,
                player1PointsChange = 0,
                player2RankBefore = null,
                player2RankAfter = null,
                player2PointsChange = null,
                player3RankBefore = null,
                player3RankAfter = null,
                player3PointsChange = null,
                player4RankBefore = null,
                player4RankAfter = null,
                player4PointsChange = null
            } = gameData;

            const db = this.userAuth.getDb();

            const query = `
                INSERT INTO match_history (
                    game_type,
                    player1_id,
                    player2_id,
                    player3_id,
                    player4_id,
                    winner_id,
                    score_player1,
                    score_player2,
                    game_duration,
                    tournament_stage,
                    player1_rank_before,
                    player1_rank_after,
                    player1_points_change,
                    player2_rank_before,
                    player2_rank_after,
                    player2_points_change,
                    player3_rank_before,
                    player3_rank_after,
                    player3_points_change,
                    player4_rank_before,
                    player4_rank_after,
                    player4_points_change
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await new Promise((resolve, reject) => {
                db.run(
                    query,
                    [
                        gameMode, 
                        player1Id, 
                        player2Id, 
                        player3Id, 
                        player4Id, 
                        winner, 
                        player1Score, 
                        player2Score, 
                        gameDuration, 
                        tournamentStage, 
                        player1RankBefore, 
                        player1RankAfter, 
                        player1PointsChange,
                        player2RankBefore,
                        player2RankAfter,
                        player2PointsChange,
                        player3RankBefore,
                        player3RankAfter,
                        player3PointsChange,
                        player4RankBefore,
                        player4RankAfter,
                        player4PointsChange
                    ],
                    function(err) {
                        if (err) return reject(err);
                        resolve(this.lastID);
                    }
                );
            });

            console.log(`🗃️ Game logged to match_history:`, {
                players: player3Id && player4Id ? 
                    `${player1Id},${player2Id} vs ${player3Id},${player4Id}` : 
                    `${player1Id} vs ${player2Id}`,
                score: `${player1Score}-${player2Score}`,
                mode: gameMode,
                winner: winner,
                stage: tournamentStage || 'N/A',
                rankChanges: {
                    player1: `${player1RankBefore} → ${player1RankAfter} (${player1PointsChange >= 0 ? '+' : ''}${player1PointsChange})`,
                    player2: player2Id ? `${player2RankBefore} → ${player2RankAfter} (${player2PointsChange >= 0 ? '+' : ''}${player2PointsChange})` : 'N/A'
                }
            });
        } catch (err) {
            console.error('❌ Error logging game history:', err);
        }
    }

    /**
     * Get player's rank progression info
     * @param {number} userId - User ID
     * @returns {object} Detailed rank and level info
     */
    async getPlayerProgression(userId) {
        const stats = await this.getUserStats(userId);
        const rankInfo = this.progression.getRankInfo(stats.rank_points);
        const levelInfo = this.progression.calculateLevel(stats.experience_points);

        return {
            userId: stats.id,
            username: stats.username,
            level: levelInfo,
            rank: rankInfo,
            gameStats: {
                played: stats.games_played,
                won: stats.games_won,
                lost: stats.games_lost,
                winRate: stats.win_rate,
                streak: stats.current_streak
            }
        };
    }

    /**
     * Apply tournament rewards (RR and XP) without affecting W/L stats
     * Tournament matches don't count toward games_played/won/lost
     * @param {number} userId - User ID
     * @param {object} rewards - Reward object with rating_change and xp_gain
     * @param {boolean} won - Whether the player won this match
     */
    async applyTournamentRewards(userId, rewards, won) {
        try {
            console.log(`🏆 Applying tournament rewards to user ${userId}: RR${rewards.rating_change >= 0 ? '+' : ''}${rewards.rating_change}, XP+${rewards.xp_gain}`);
            
            // Get current stats
            const stats = await this.getUserStats(userId);
            
            // Calculate new values
            const newRating = Math.max(0, stats.rank_points + rewards.rating_change);
            const newXp = stats.experience_points + rewards.xp_gain;
            
            // Calculate new level
            const newLevelInfo = this.progression.calculateLevel(newXp);
            
            // Calculate new rank
            const newRankInfo = this.progression.getRankInfo(newRating);
            
            // Update database - only RR, XP, and level, NOT game counts
            await this.userAuth.db.run(
                `UPDATE users 
                 SET rank_points = ?, 
                     experience_points = ?, 
                     player_level = ?
                 WHERE id = ?`,
                [newRating, newXp, newLevelInfo.level, userId]
            );
            
            console.log(`✅ Tournament rewards applied: User ${userId} now has ${newRating} RR, ${newXp} XP, Level ${newLevelInfo.level}`);
            
            return {
                success: true,
                newRating,
                newXp,
                newLevel: newLevelInfo.level,
                newRank: newRankInfo.tier
            };
            
        } catch (error) {
            console.error(`❌ Error applying tournament rewards for user ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get player stats (simplified version for tournament)
     * @param {number} userId - User ID
     * @returns {object} Player stats with rank_points, experience_points, and player_level
     */
    async getPlayerStats(userId) {
        return new Promise((resolve, reject) => {
            const db = this.userAuth.getDb();
            db.get(
                'SELECT rank_points, experience_points, player_level, games_played, games_won, games_lost FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else if (!row) {
                        reject(new Error(`User ${userId} not found`));
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }
}

module.exports = GameStatsHandler;