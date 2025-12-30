#!/bin/bash

# Real-time game status monitoring
# This script monitors user game_status changes in real-time

DB_CONTAINER="merged_branch-db-init-1"
DB_PATH="/usr/src/app/db/shared.sqlite"

echo "🎮 Real-time Game Status Monitor"
echo "================================="
echo "Monitoring game_status changes for all users..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    clear
    echo "🎮 Real-time Game Status Monitor - $(date '+%H:%M:%S')"
    echo "=================================================================="
    echo ""
    
    # Get all users with their status
    docker exec $DB_CONTAINER sqlite3 -header -column $DB_PATH \
        "SELECT 
            id as ID, 
            username as Username, 
            CASE is_online WHEN 1 THEN '🟢 Online' ELSE '⚫ Offline' END as Status,
            CASE game_status 
                WHEN 'offline' THEN '⚫ Offline'
                WHEN 'online' THEN '🟢 Available'
                WHEN 'in_queue' THEN '⏳ In Queue'
                WHEN 'in_game' THEN '🎮 In Game'
                WHEN 'in_tournament' THEN '🏆 Tournament'
                ELSE game_status
            END as GameStatus
        FROM users 
        WHERE id <= 8
        ORDER BY is_online DESC, game_status;"
    
    echo ""
    echo "Legend: 🟢 Available | ⏳ In Queue | 🎮 In Game | 🏆 Tournament | ⚫ Offline"
    echo "Refreshing in 2 seconds..."
    
    sleep 2
done
