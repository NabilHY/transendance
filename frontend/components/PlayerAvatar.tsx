'use client';

import React, { useState, useEffect } from 'react';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';
import styles from './PlayerAvatar.module.css';

interface PlayerAvatarProps {
  user?: {
    id?: number;
    username?: string;
    profile_pic?: string | null;
    avatar_updated_at?: number | null;
    first_name?: string;
    last_name?: string;
  } | null;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  user, 
  size = 'small',
  className = '' 
}) => {
  console.log('🔍 PlayerAvatar props received:', { 
    user, 
    hasUser: !!user, 
    userId: user?.id,
    username: user?.username,
    size 
  });
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAvatarError(false);

    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    const userData: UserWithAvatar = {
      id: user.id,
      profile_pic: user.profile_pic,
      avatar_updated_at: user.avatar_updated_at,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    getAvatarUrl(userData, { isCurrentUser: false, fallback: null })
      .then(url => {
        if (!cancelled) {
          setAvatarUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatarError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.profile_pic, user?.avatar_updated_at]);

  const sizeClass = styles[size] || styles.small;
  
  // Generate initials with better fallback logic
  let initials = '?';
  if (user) {
    if (user.first_name && user.last_name) {
      initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user.username && user.username.length > 0) {
      initials = user.username.length >= 2 
        ? user.username.substring(0, 2).toUpperCase()
        : user.username[0].toUpperCase();
    }
  }
  
  console.log('👤 PlayerAvatar render:', {
    userId: user?.id,
    username: user?.username,
    firstName: user?.first_name,
    lastName: user?.last_name,
    initials,
    hasAvatar: !!avatarUrl,
    loading,
    error: avatarError,
    size
  });

  return (
    <div className={`${styles.avatarContainer} ${sizeClass} ${className}`}>
      {avatarUrl && !avatarError && !loading ? (
        <img
          src={avatarUrl}
          alt={user?.username || 'Player'}
          className={styles.avatarImage}
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div className={styles.avatarPlaceholder}>
          {initials}
        </div>
      )}
    </div>
  );
};
