# Game Status Feature Implementation

**Date:** December 22, 2025  
**Feature:** Added `game_status` column to track player activity states (offline, online, in_queue, in_game, in_tournament)

---

## Overview

This implementation adds a new `game_status` column to the database that provides granular tracking of player states beyond the existing `is_online` field. This enables the invite-to-match feature to determine if a player is available to receive game invitations.

## Database Changes

### 1. Added `game_status` Column to Users Table

**File:** `db-init/utils/migrations.js`

**Changes:**
- Added migration to create `game_status TEXT DEFAULT 'offline'` column
- Created database trigger `enforce_game_status_on_offline` that automatically sets `game_status = 'offline'` when `is_online = 0`
- Initial data migration: Sets existing users' `game_status` to 'online' if `is_online = 1`, otherwise 'offline'

**Valid game_status Values:**
- `'offline'` - User is completely disconnected
- `'online'` - User is connected and available
- `'in_queue'` - User is waiting in matchmaking queue
- `'in_game'` - User is actively playing a game
- `'in_tournament'` - User is in a tournament (queued or playing)

**Trigger Logic:**
```sql
CREATE TRIGGER IF NOT EXISTS enforce_game_status_on_offline
AFTER UPDATE OF is_online ON users
FOR EACH ROW
WHEN NEW.is_online = 0
BEGIN
    UPDATE users SET game_status = 'offline' WHERE id = NEW.id;
END
```

This ensures that when a user disconnects (`is_online = 0`), their `game_status` is automatically reset to `'offline'`, maintaining data consistency.

---

## Backend Changes

### 2. UserAuth.js - Game Status Management

**File:** `game-backend/UserAuth.js`

**Added Methods:**

#### `setUserGameStatus(userId, gameStatus)`
Updates a user's game_status in the database.

**Parameters:**
- `userId` (number): The user's ID
- `gameStatus` (string): One of: 'offline', 'online', 'in_queue', 'in_game', 'in_tournament'

**Returns:** Promise<boolean>

**Validation:** Rejects if gameStatus is not one of the valid values

**Example:**
```javascript
await this.userAuth.setUserGameStatus(user.id, 'in_game');
```

#### `getUserGameStatus(userId)`
Retrieves a user's current game_status and is_online values.

**Parameters:**
- `userId` (number): The user's ID

**Returns:** Promise<{ gameStatus: string, isOnline: boolean }>

**Example:**
```javascript
const status = await this.userAuth.getUserGameStatus(user.id);
// Returns: { gameStatus: 'in_game', isOnline: true }
```

---

### 3. WebSocketHandler.js - State Transitions

**File:** `game-backend/WebSocketHandler.js`

**State Transition Points:**

#### Connection Established
```javascript
// Set user online and game_status to 'online' (available)
await this.userAuth.setUserOnlineStatus(user.id, true);
await this.userAuth.setUserGameStatus(user.id, 'online');
```

#### Joining Matchmaking Queue
```javascript
// Set user's game_status to 'in_queue'
await this.userAuth.setUserGameStatus(user.id, 'in_queue');
```

#### Match Created (Matchmaking)
```javascript
// Set both players' game_status to 'in_game'
await this.userAuth.setUserGameStatus(player1.user.id, 'in_game');
await this.userAuth.setUserGameStatus(player2.user.id, 'in_game');
```

#### Solo/AI Game Started
```javascript
// Set user's game_status to 'in_game'
await this.userAuth.setUserGameStatus(user.id, 'in_game');
```

#### Tournament Queue/Started
```javascript
// Set user's game_status to 'in_tournament'
await this.userAuth.setUserGameStatus(user.id, 'in_tournament');
```

#### Quad Pong Match Created
```javascript
// Set all 4 players' game_status to 'in_game'
for (const playerResult of result) {
    await this.userAuth.setUserGameStatus(playerResult.user.id, 'in_game');
}
```

#### Quad Pong Queue
```javascript
// Set user's game_status to 'in_queue'
await this.userAuth.setUserGameStatus(user.id, 'in_queue');
```

#### Matchmaking Cancelled
```javascript
// Reset user's game_status back to 'online'
await this.userAuth.setUserGameStatus(user.id, 'online');
```

#### Disconnection
```javascript
// Set user offline (trigger automatically sets game_status to 'offline')
await this.userAuth.setUserOnlineStatus(user.id, false);
```

---

### 4. GameManager.js - Game Completion

**File:** `game-backend/GameManager.js`

**Changes in `sendWinScreenData()` method:**

When a game ends and win screen data is sent to players, their `game_status` is reset back to `'online'`:

```javascript
// Reset player's game_status back to 'online' after game ends
if (player1Info.user?.id) {
    this.userAuth.setUserGameStatus(player1Info.user.id, 'online')
        .catch(err => console.error('Error resetting game_status for player1:', err));
}

if (player2Info.user?.id) {
    this.userAuth.setUserGameStatus(player2Info.user.id, 'online')
        .catch(err => console.error('Error resetting game_status for player2:', err));
}
```

---

## State Flow Diagram

```
User Connects
    ↓
is_online = 1, game_status = 'online'
    ↓
    ├─→ Joins Matchmaking → game_status = 'in_queue'
    │       ↓
    │   Match Found → game_status = 'in_game'
    │       ↓
    │   Game Ends → game_status = 'online'
    │
    ├─→ Joins Tournament → game_status = 'in_tournament'
    │       ↓
    │   Tournament Ends → game_status = 'online'
    │
    ├─→ Starts Solo/AI → game_status = 'in_game'
    │       ↓
    │   Game Ends → game_status = 'online'
    │
    └─→ Cancels Queue → game_status = 'online'
        ↓
    Disconnects
        ↓
is_online = 0, game_status = 'offline' (automatic via trigger)
```

---

## Usage for Invite System

With this implementation, you can now check if a user is available for invites:

```javascript
// Check if user can receive invites
const status = await this.userAuth.getUserGameStatus(targetUserId);

if (status.gameStatus === 'in_game' || status.gameStatus === 'in_queue') {
    return { error: 'User is currently busy', busy: true };
}

if (status.gameStatus === 'in_tournament') {
    return { error: 'User is in a tournament', busy: true };
}

if (status.gameStatus === 'offline' || !status.isOnline) {
    return { error: 'User is offline', busy: true };
}

// User is 'online' and available!
sendInvite(targetUserId);
```

### Query Available Players

To get a list of online players who are available (not in game):

```javascript
// In usr-manag or game-backend
const availablePlayers = db.prepare(`
    SELECT id, username, first_name, last_name, profile_pic, game_status
    FROM users
    WHERE is_online = 1 
    AND game_status = 'online'
    ORDER BY username
`).all();
```

---

## Files Modified

1. **`db-init/utils/migrations.js`** - Added game_status column and trigger
2. **`game-backend/UserAuth.js`** - Added setUserGameStatus() and getUserGameStatus() methods
3. **`game-backend/WebSocketHandler.js`** - Added game_status updates at state transitions
4. **`game-backend/GameManager.js`** - Added game_status reset on game completion

---

## Testing

### Manual Testing Steps

1. **Check column exists:**
```bash
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "PRAGMA table_info(users);" | grep game_status
```

2. **Check trigger exists:**
```bash
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='enforce_game_status_on_offline';"
```

3. **Test the trigger:**
```bash
# Set a user online with game_status = 'in_game'
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "UPDATE users SET is_online = 1, game_status = 'in_game' WHERE id = 1;"

# Verify
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "SELECT id, username, is_online, game_status FROM users WHERE id = 1;"

# Set user offline (should trigger game_status to 'offline')
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "UPDATE users SET is_online = 0 WHERE id = 1;"

# Verify game_status is now 'offline'
docker exec merged_branch-db-init-1 sqlite3 /usr/src/app/db/shared.sqlite \
  "SELECT id, username, is_online, game_status FROM users WHERE id = 1;"
```

4. **Test in-game flow:**
   - Connect to game WebSocket
   - Join matchmaking
   - Check database: `game_status` should be 'in_queue'
   - Match starts
   - Check database: `game_status` should be 'in_game'
   - Game ends
   - Check database: `game_status` should be 'online'

---

## Migration Status

- ✅ Database schema updated
- ✅ Trigger created
- ✅ Backend methods implemented
- ✅ WebSocket handlers updated
- ⏳ Migration needs to be run (restart db-init container)

---

## Notes

- The `game_status` column is text-based for flexibility and readability
- The database trigger ensures data consistency when users disconnect
- All state transitions are logged for debugging
- Error handling is non-blocking (uses `.catch()`) to prevent game flow disruption
- The feature is backward compatible - existing code continues to work with just `is_online`

---

## Next Steps for Invite Feature

1. Add invite management methods to GameManager.js
2. Create WebSocket message handlers for invite events
3. Add frontend UI for online users list
4. Implement invite notifications
5. Add invite accept/decline logic
6. Test end-to-end invite flow

See the earlier analysis document for detailed invite system implementation guide.
