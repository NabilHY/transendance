import { UMUser } from '@/lib/api';
import './ProfileCard.css'
import CurrentUserProfileNotice from './CurrentUserProfileNotice';

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
}

export function ProfileCard({ profile, isCurrentUser, onAddFriend, friendshipStatus, acceptRequest, invitationReceived, blockUser, rejectRequest, handleMessageBtn, handleUnblock }: ProfileCardProps) {

  // console.log("status: ", profile,);
  

  return (
    <div className="profile-card">
      <div className="profile-card-inner">
        <div className="avatar-wrapper">

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
                  {profile.username.charAt(0).toUpperCase()}
              </div>

          {/* <img
            src={profile.profile_pic}
            alt={profile.first_name + ' ' + profile.last_name}
            className="avatar-image"
          /> */}
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

        <div className={`button-grid ${isCurrentUser ? "no-display" : ""} ${friendshipStatus === "blocked" || friendshipStatus === "blocker" || friendshipStatus === "pending" ? "no-display" : null }`}>
          <button className="btn-primary">Invite to Match</button>
          <button className="btn-secondary" onClick={handleMessageBtn} >Message</button>
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
            <div className="stat-number">120</div>
            <div className="stat-label">Games</div>
          </div>
          <div className="stat-card">
            {/* <div className="stat-number">{profile.total_wins}</div> */}
            <div className="stat-number">85</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">75%</div>
              {/* {profile.win_rate > 0 ? profile.win_rate.toFixed(0) : '—'}%
            </div> */}
            <div className="stat-label">Win Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
