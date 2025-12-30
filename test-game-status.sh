#!/bin/bash

# Test script for game_status feature
# This script tests the game_status column and trigger functionality

DB_CONTAINER="merged_branch-db-init-1"
DB_PATH="/usr/src/app/db/shared.sqlite"

echo "🧪 Testing game_status Feature"
echo "================================"
echo ""

# Function to query user status
query_user_status() {
    docker exec $DB_CONTAINER sqlite3 $DB_PATH \
        "SELECT id, username, is_online, game_status FROM users WHERE id = $1;"
}

# Function to update user status
update_status() {
    docker exec $DB_CONTAINER sqlite3 $DB_PATH \
        "UPDATE users SET is_online = $2, game_status = '$3' WHERE id = $1;"
}

echo "📋 Test 1: Check column exists"
echo "--------------------------------"
docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "PRAGMA table_info(users);" | grep game_status
echo ""

echo "📋 Test 2: Check trigger exists"
echo "--------------------------------"
docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name='enforce_game_status_on_offline';"
echo ""

echo "📋 Test 3: Initial state of user 1"
echo "--------------------------------"
echo "id|username|is_online|game_status"
query_user_status 1
echo ""

echo "📋 Test 4: Set user online with game_status='online'"
echo "--------------------------------"
update_status 1 1 "online"
echo "Updated. New status:"
query_user_status 1
echo ""

echo "📋 Test 5: Simulate user joining queue (game_status='in_queue')"
echo "--------------------------------"
update_status 1 1 "in_queue"
echo "Updated. New status:"
query_user_status 1
echo ""

echo "📋 Test 6: Simulate user entering game (game_status='in_game')"
echo "--------------------------------"
update_status 1 1 "in_game"
echo "Updated. New status:"
query_user_status 1
echo ""

echo "📋 Test 7: Test trigger - Set user offline (should auto-set game_status='offline')"
echo "--------------------------------"
docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "UPDATE users SET is_online = 0 WHERE id = 1;"
echo "Set is_online=0. Trigger should set game_status='offline':"
query_user_status 1
echo ""

echo "📋 Test 8: Try to set game_status while offline (should stay offline due to trigger)"
echo "--------------------------------"
docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "UPDATE users SET game_status = 'in_game' WHERE id = 1;"
echo "Attempted to set game_status='in_game' while offline:"
query_user_status 1
echo "Note: game_status may be 'in_game' briefly, but trigger runs on is_online change."
echo ""

echo "📋 Test 9: Full lifecycle test"
echo "--------------------------------"
echo "Starting lifecycle..."
update_status 1 1 "online"
echo "1. Connected (online):"
query_user_status 1
echo ""

update_status 1 1 "in_queue"
echo "2. Joined matchmaking (in_queue):"
query_user_status 1
echo ""

update_status 1 1 "in_game"
echo "3. Match started (in_game):"
query_user_status 1
echo ""

update_status 1 1 "online"
echo "4. Game ended (back to online):"
query_user_status 1
echo ""

docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "UPDATE users SET is_online = 0 WHERE id = 1;"
echo "5. Disconnected (offline via trigger):"
query_user_status 1
echo ""

echo "✅ All tests complete!"
echo ""
echo "📊 Current status of all users:"
echo "--------------------------------"
docker exec $DB_CONTAINER sqlite3 $DB_PATH \
    "SELECT id, username, is_online, game_status FROM users LIMIT 8;" | \
    awk 'BEGIN{print "ID | Username | Online | Game Status"} {print}'
