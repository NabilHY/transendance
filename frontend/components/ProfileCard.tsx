import { UMUser } from '@/lib/api';
import './ProfileCard.css'
import CurrentUserProfileNotice from './CurrentUserProfileNotice';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useState, useEffect } from 'react';

interface ProfileCardProps {
  profile: UMUser;
  onAddFriend: () => void;
  friendshipStatus: string | null;
  isCurrentUser: boolean;
  acceptRequest: () => void;
  invitationReceived?: boolean;
  blockUser: () => void;
  rejectRequest?: () => void;
  handleMessageBtn: () => void;
  handleUnblock?: () => void;
  playerStats?: {
    games_played: number;
    games_won: number;
    win_rate: number;
    current_streak: number;
    rank_tier: string;
    player_level: number;
  };
}

export function ProfileCard({ profile, isCurrentUser, onAddFriend, friendshipStatus, acceptRequest, invitationReceived, blockUser, rejectRequest, handleMessageBtn, handleUnblock, playerStats }: ProfileCardProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAvatarUrl(profile, { isCurrentUser }).then(url => {
      if (!cancelled) {
        setAvatarUrl(url);
      }
    }).catch(() => {
      if (!cancelled) {
        setAvatarError(true);
      }
    });
    return () => { cancelled = true; };
  }, [profile.id, profile.profile_pic, profile.avatar_updated_at, isCurrentUser]);

  console.log("playerStats: ", playerStats);
  

  return (
    <div className="profile-card">
      <div className="profile-card-inner">
        <div className="avatar-wrapper">
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={profile.first_name + ' ' + profile.last_name}
              className="avatar-image"
              onError={() => setAvatarError(true)}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 'bold',
              color: '#666'
            }}>
              {getInitials(profile)}
            </div>
          )}
          <div className={`${profile.is_online ? 'status-online' : ''}`}></div>
        </div>

        <h2 className="profile-name">{profile.first_name + ' ' + profile.last_name}</h2>
        <p className="profile-username">@{profile.username}</p>

        <div className={`profile-stats-row ${friendshipStatus === "blocked" || friendshipStatus === "blocker" ? "no-display" : null }`}>
          <div className="profile-stat">
            Status:{' '}
            <span className={`${profile.is_online ? 'status-online' : 'status-offline'}`}>{profile.is_online ? 'Online' : 'Offline'}</span>
          </div>
        </div>

          {invitationReceived && (
            <>
              <span className="friend-request-message">You have a friend request</span>
              <div className="button-grid">
                <button className="btn-accept" onClick={acceptRequest}>Accept</button>
                <button className="btn-danger" onClick={rejectRequest}>Reject</button>
              </div>
            </>
          )}

        <div style={{width: '100%', marginTop: '10px'}} className={`${isCurrentUser ? "no-display" : ""} ${friendshipStatus === "blocked" || friendshipStatus === "blocker" || friendshipStatus === "pending" ? "no-display" : null }`}>
          {/* <button className="btn-primary">Invite to Match</button> */}
          <button style={{width: '100%'}} className="btn-secondary" onClick={handleMessageBtn} >Message</button>
        </div>
        {/* for blockers users */}
        <div className={`button-grid mt-small ${isCurrentUser ? "no-display" : ""} ${friendshipStatus !== "blocker" ? "no-display" : "blocking" }`}>
          <button className={`btn-danger`} onClick={handleUnblock}>Unblock
          </button>
        </div>

        {/* <div className={`button-grid mt-small ${friendshipStatus !== "pending" ? "no-display" : "blocking" }`}>
          <button className={`btn-secondary`} onClick={rejectRequest}>Cancel Request
          </button>
        </div> */}

         {/* for blocked users */}
        <div className={`button-grid mt-small ${isCurrentUser ? "no-display" : ""} ${friendshipStatus !== "blocked" ? "no-display" : "blocking" }`}>
          <button className={`btn-danger`} onClick={onAddFriend}>You got blocked
          </button>
        </div>


        <div className={`button-grid mt-small ${isCurrentUser ? "no-display" : ""} ${friendshipStatus === "blocked" || friendshipStatus === "blocker" ? "no-display" : null }`}>
          <button className={`
            ${friendshipStatus === "accepted" ? "btn-accept" : friendshipStatus === "pending" ? "btn-pending" : "btn-secondary"} 
            ${friendshipStatus !== 'Add Friend' ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
            disabled={friendshipStatus !== 'Add Friend'} 
            onClick={onAddFriend}>{friendshipStatus === "accepted" ? "Friends" : (friendshipStatus || 'Add Friend')}</button>
          <button className="btn-danger" onClick={blockUser}>Block</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            {/* <div className="stat-number">{profile.total_games}</div> */}
            <div className="stat-number">{playerStats ? playerStats.games_played : '—'}</div>
            <div className="stat-label">Games</div>
          </div>
          <div className="stat-card">
            {/* <div className="stat-number">{profile.total_wins}</div> */}
            <div className="stat-number">{playerStats ? playerStats.games_won : '—'}</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{playerStats ? playerStats.win_rate : '—'}%</div>
              {/* {profile.win_rate > 0 ? profile.win_rate.toFixed(0) : '—'}%
            </div> */}
            <div className="stat-label">Win Rate</div>
          </div>

<div className="stat-card">
            {/* <div className="stat-number">{profile.total_games}</div> */}
            <div className="stat-number">{playerStats ? playerStats.player_level : '—'}</div>
            <div className="stat-label">Level</div>
          </div>
          <div className="stat-card">
            {/* <div className="stat-number">{profile.total_wins}</div> */}
            <div className="stat-number">{playerStats ? playerStats.current_streak : '—'}</div>
            <div className="stat-label">current streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{playerStats ? playerStats.rank_tier : '—'}</div>
              {/* {profile.win_rate > 0 ? profile.win_rate.toFixed(0) : '—'}%
            </div> */}
            <div className="stat-label">rank</div>
          </div>

        </div>
      </div>
    </div>
  );
}
