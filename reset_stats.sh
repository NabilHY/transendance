#!/bin/bash
docker-compose exec db-init sqlite3 /usr/src/app/db/shared.sqlite "UPDATE users SET rank_points = 0, rank_tier = 'Bronze', games_played = 0, games_won = 0, games_lost = 0, win_rate = 0.0, current_streak = 0, player_level = 1, experience_points = 0 WHERE id > 0;"
docker-compose exec db-init sqlite3 /usr/src/app/db/shared.sqlite "DELETE FROM match_history;"
docker-compose exec db-init sqlite3 /usr/src/app/db/shared.sqlite "SELECT COUNT(*) as total_matches FROM match_history; SELECT username, games_played, games_won, rank_points FROM users LIMIT 5;"
