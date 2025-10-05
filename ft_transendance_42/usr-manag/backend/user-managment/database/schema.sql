-- ============================================
-- ft_transcendence Database Schema
-- ============================================

CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    two_f_secret TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    profile_pic TEXT,
    is_online INTEGER DEFAULT 0
);

CREATE TABLE BlockedUsers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    blocked_users TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE Channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_private INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    members TEXT,
    members_count INTEGER DEFAULT 0,
    description TEXT
);

CREATE TABLE Messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    FOREIGN KEY(channel_id) REFERENCES Channels(id),
    FOREIGN KEY(sender_id) REFERENCES Users(id)
);

CREATE TABLE ChannelMembers (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id) REFERENCES Channels(id),
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE Leaderboard (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    rank INTEGER,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE Games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('1v1', 'team')) NOT NULL,
    status TEXT CHECK(status IN ('waiting', 'in_progress', 'finished')) DEFAULT 'waiting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Matches (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    player1_id TEXT NOT NULL,
    player2_id TEXT NOT NULL,
    winner_id TEXT,
    score_player1 INTEGER DEFAULT 0,
    score_player2 INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY(game_id) REFERENCES Games(id),
    FOREIGN KEY(player1_id) REFERENCES Users(id),
    FOREIGN KEY(player2_id) REFERENCES Users(id),
    FOREIGN KEY(winner_id) REFERENCES Users(id)
);

CREATE TABLE Friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id),
    FOREIGN KEY(friend_id) REFERENCES Users(id)
);

CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    jwt_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE Notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('FRIEND_REQUEST', 'GAME_INVITE', 'MESSAGE', 'SYSTEM')) NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE AdminActions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    action_type TEXT CHECK(action_type IN ('BAN', 'MUTE', 'KICK', 'WARN')) NOT NULL,
    reason TEXT,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY(admin_id) REFERENCES Users(id),
    FOREIGN KEY(target_user_id) REFERENCES Users(id)
);
