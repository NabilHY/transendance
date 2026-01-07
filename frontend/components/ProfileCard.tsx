import { UMUser } from '@/lib/api';
import CurrentUserProfileNotice from './CurrentUserProfileNotice';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useState, useEffect } from 'react';
import styles from '@/app/users/[id]/UserProfile.module.css';

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
    <div className={styles.profileCard}>
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper}>
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={profile.first_name + ' ' + profile.last_name}
              className={styles.avatarImage}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {getInitials(profile)}
            </div>
          )}
          <div className={`${styles.statusIndicator} ${profile.is_online ? styles.statusIndicatorOnline : styles.statusIndicatorOffline}`}></div>
        </div>

        <h2 className={styles.profileName}>{profile.first_name + ' ' + profile.last_name}</h2>
        <p className={styles.profileUsername}>@{profile.username}</p>

        {friendshipStatus !== "blocked" && friendshipStatus !== "blocker" && (
          <div className={`${styles.statusBadge} ${profile.is_online ? styles.statusBadgeOnline : styles.statusBadgeOffline}`}>
            <span>{profile.is_online ? '●' : '○'}</span>
            {profile.is_online ? 'Online' : 'Offline'}
          </div>
        )}
      </div>

      <div className={styles.actionButtons}>
        {invitationReceived && (
          <>
            <div className={styles.friendRequestMessage}>You have a friend request</div>
            <div className={styles.buttonRow}>
              <button className={styles.btnAccept} onClick={acceptRequest}>Accept</button>
              <button className={styles.btnDanger} onClick={rejectRequest}>Reject</button>
            </div>
          </>
        )}

        {!isCurrentUser && friendshipStatus !== "blocked" && friendshipStatus !== "blocker" && friendshipStatus !== "pending" && (
          <div className={styles.buttonRowSingle}>
            <button className={styles.btnSecondary} onClick={handleMessageBtn}>Message</button>
          </div>
        )}

        {!isCurrentUser && friendshipStatus === "blocker" && (
          <div className={styles.buttonRowSingle}>
            <button className={styles.btnDanger} onClick={handleUnblock}>Unblock</button>
          </div>
        )}

        {!isCurrentUser && friendshipStatus === "blocked" && (
          <div className={styles.buttonRowSingle}>
            <button className={styles.btnDanger} disabled>You got blocked</button>
          </div>
        )}

        {!isCurrentUser && friendshipStatus !== "blocked" && friendshipStatus !== "blocker" && (
          <div className={styles.buttonRow}>
            <button 
              className={
                friendshipStatus === "accepted" ? styles.btnAccept : 
                friendshipStatus === "pending" ? styles.btnPending : 
                styles.btnSecondary
              } 
              disabled={friendshipStatus !== 'Add Friend' && friendshipStatus !== null} 
              onClick={onAddFriend}
            >
              {friendshipStatus === "accepted" ? "Friends" : (friendshipStatus || 'Add Friend')}
            </button>
            <button className={styles.btnDanger} onClick={blockUser}>Block</button>
          </div>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{playerStats ? playerStats.games_played : '—'}</div>
          <div className={styles.statLabel}>Games</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{playerStats ? playerStats.games_won : '—'}</div>
          <div className={styles.statLabel}>Wins</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{playerStats ? (playerStats.win_rate?.toFixed(1) || '0.0') : '—'}%</div>
          <div className={styles.statLabel}>Win Rate</div>
        </div>
      </div>
    </div>
  );
}
