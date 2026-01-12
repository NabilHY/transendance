'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Users, Home, Settings, LogOut, Search, X, UserPlus, UserX, User as UserIcon, Circle } from 'lucide-react';
import baseStyles from '../login/LoginPage.module.css';
import styles from './UsersPage.module.css';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';
import type { UMUser } from '@/lib/api';
import {
    fetchFriendshipStatus,
    handleAddFriend as addFriendAction,
    handleBlockUser as blockUserAction,
    acceptRequest,
    rejectRequest,
    invitationsReceived,
} from '@/lib/friends';

function UserAvatar({ user }: { user: any }) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const userData: UserWithAvatar = {
            id: user.id,
            profile_pic: user.profile_pic,
            avatar_updated_at: user.avatar_updated_at,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
        };
        getAvatarUrl(userData, { isCurrentUser: false }).then(url => {
            if (!cancelled) setAvatarUrl(url);
        }).catch(() => {
            if (!cancelled) setAvatarError(true);
        });
        return () => { cancelled = true; };
    }, [user?.id, user?.profile_pic, user?.avatar_updated_at]);

    return (
        <div className={styles.avatarContainer}>
            {avatarUrl && !avatarError ? (
                <img 
                    src={avatarUrl} 
                    alt={user.username}
                    onError={() => setAvatarError(true)}
                    className={styles.avatarImage}
                />
            ) : (
                <div className={styles.avatarPlaceholder}>
                    {getInitials({
                        id: user.id,
                        username: user.username,
                        first_name: user.first_name,
                        last_name: user.last_name,
                    })}
                </div>
            )}
            <div className={`${styles.statusIndicator} ${user.is_online ? styles.statusIndicatorOnline : styles.statusIndicatorOffline}`} />
        </div>
    );
}

export default function UsersPage() {
    const { 
        users, 
        searchQuery, 
        setSearchQuery, 
        usersLoading, 
        error, 
        fetchUsers, 
        searchUsers, 
        clearError 
    } = useUser();

    const { user: currentUser, logout } = useAuth();
    const { loading: authLoading } = useRequireAuth();
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [friendshipStatusByUserId, setFriendshipStatusByUserId] = useState<Record<number, string | null>>({});
    const [invitationsReceivedByUserId, setInvitationsReceivedByUserId] = useState<Record<number, boolean>>({});
    const [blockConfirmation, setBlockConfirmation] = useState<UMUser | null>(null);

    useEffect(() => {
        if (!authLoading) {
            fetchUsers();
        }
    }, [authLoading, fetchUsers]);

    // Keep a lightweight friendship-status cache for the list UI.
    useEffect(() => {
        if (!currentUser || users.length === 0) return;

        let cancelled = false;

        const loadStatuses = async () => {
            const missing = users.filter(u => Number(currentUser.id) !== u.id && friendshipStatusByUserId[u.id] === undefined);
            if (missing.length === 0) return;

            await Promise.all(
                missing.map(async (u) => {
                    await fetchFriendshipStatus(u, currentUser, (status) => {
                        if (cancelled) return;
                        setFriendshipStatusByUserId(prev => ({ ...prev, [u.id]: status }));
                    });
                    await invitationsReceived(u, currentUser, (received) => {
                        if (cancelled) return;
                        setInvitationsReceivedByUserId(prev => ({ ...prev, [u.id]: received }));
                    });
                })
            );
        };

        loadStatuses();
        return () => {
            cancelled = true;
        };
        // Intentionally *not* depending on friendshipStatusByUserId to avoid re-fetch loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, users]);

    // Poll for online status updates every 5 seconds
    // useEffect(() => {
    //     if (authLoading) return;

    //     // Only poll if we have users and we're not currently loading
    //     if (users.length === 0) return;

    //     const pollInterval = setInterval(() => {
    //         // Only poll if not currently performing an operation
    //         if (usersLoading) return;

    //         // Refresh users list to get updated online status
    //         // If there's a search query, re-run the search to preserve results
    //         if (searchQuery.trim()) {
    //             searchUsers(searchQuery);
    //         } else {
    //             fetchUsers();
    //         }
    //     }, 5000); // Poll every 5 seconds

    //     // Cleanup interval on unmount or when dependencies change
    //     return () => clearInterval(pollInterval);
    // }, [authLoading, users.length, usersLoading, searchQuery, fetchUsers, searchUsers]);

    // Also poll when page becomes visible (user switches back to tab)
    useEffect(() => {
        if (authLoading || usersLoading) return;

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Page became visible, refresh users immediately
                // Preserve search query if it exists
                if (searchQuery.trim()) {
                    searchUsers(searchQuery);
                } else {
                    fetchUsers();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [authLoading, usersLoading, searchQuery, fetchUsers, searchUsers]);

    const handleSearch = async (query: string) => {
        if (query.trim()) {
            await searchUsers(query);
        } else {
            await fetchUsers();
        }
    };

    const handleAddFriend = async (targetUser: UMUser) => {
        if (!currentUser) return;
        console.log("target user: ", targetUser);
        console.log("id: ", currentUser.id);
        console.log("current user: ", currentUser);

        setActionLoading(targetUser.id);
        try {
            await addFriendAction(
                targetUser,
                String(targetUser.id),
                currentUser,
                (loading) => setActionLoading(loading ? targetUser.id : null),
                (status) => setFriendshipStatusByUserId(prev => ({ ...prev, [targetUser.id]: status })),
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleBlockUser = async (targetUser: UMUser) => {
        setBlockConfirmation(targetUser);
    };

    const handleConfirmBlock = async () => {
        if (!blockConfirmation) return;

        setActionLoading(blockConfirmation.id);
        try {
            await blockUserAction(
                blockConfirmation,
                String(blockConfirmation.id),
                (loading) => setActionLoading(loading ? blockConfirmation.id : null),
            );
            // Keep behavior consistent with previous implementation: refresh the list after blocking.
            await fetchUsers();
            setFriendshipStatusByUserId({});
        } finally {
            setActionLoading(null);
            setBlockConfirmation(null);
        }
    };

    const handleAcceptRequest = async (targetUser: UMUser) => {
        if (!currentUser) return;

        setActionLoading(targetUser.id);
        try {
            await acceptRequest(
                targetUser,
                currentUser,
                (status) => setFriendshipStatusByUserId(prev => ({ ...prev, [targetUser.id]: status })),
                (received) => setInvitationsReceivedByUserId(prev => ({ ...prev, [targetUser.id]: received })),
            );
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (targetUser: UMUser) => {
        if (!currentUser) return;

        setActionLoading(targetUser.id);
        try {
            await rejectRequest(
                targetUser,
                currentUser,
                (status) => setFriendshipStatusByUserId(prev => ({ ...prev, [targetUser.id]: status })),
                (received) => setInvitationsReceivedByUserId(prev => ({ ...prev, [targetUser.id]: received })),
            );
        } finally {
            setActionLoading(null);
        }
    };

    if (authLoading) {
        return <LoadingScreen />;
    }

    return (
        <main className={`${baseStyles.page} ${styles.page}`}>
            {/* Block Confirmation Modal */}
            {blockConfirmation && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Block User</h2>
                        <p className={styles.modalMessage}>
                            Are you sure you want to block <strong>{blockConfirmation.username}</strong>? They won't be able to send you friend requests or interact with you.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setBlockConfirmation(null)}
                                disabled={actionLoading === blockConfirmation.id}
                                className={styles.modalCancelBtn}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBlock}
                                disabled={actionLoading === blockConfirmation.id}
                                className={styles.modalConfirmBtn}
                            >
                                {actionLoading === blockConfirmation.id ? 'Blocking...' : 'Yes, Block User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`${baseStyles.container} ${styles.container}`}>
                {/* Navigation Header */}
                <div className={styles.navHeader}>
                    <h1 className={styles.navTitle}>
                        <Users size={24} />
                        Browse Users
                    </h1>
                    <nav className={styles.nav}>
                        <Link href="/" className={styles.navLink}>
                            <Home size={16} />
                            Dashboard
                        </Link>
                        <Link href="/profile" className={styles.navLink}>
                            <UserIcon size={16} />
                            Profile
                        </Link>
                        <Link href="/settings" className={styles.navLink}>
                            <Settings size={16} />
                            Settings
                        </Link>
                        <button onClick={logout} className={styles.logoutBtn}>
                            <LogOut size={16} />
                            Logout
                        </button>
                </nav>
                </div>

            {error && (
                    <div className={styles.errorContainer}>
                        <span>{error}</span>
                        <button onClick={clearError} className={styles.errorDismissBtn}>
                        Dismiss
                    </button>
                </div>
            )}

                {/* Search Section */}
                <section className={baseStyles.card} style={{ width: '100%' }}>
                    <div className={baseStyles.cardHeader} style={{ textAlign: 'left', marginBottom: '24px' }}>
                        <h2 className={baseStyles.title} style={{ fontSize: '24px', marginBottom: '8px' }}>
                            Search Users
                        </h2>
                        <p className={baseStyles.subtitle} style={{ textAlign: 'left' }}>
                            Find users by username, first name, or last name
                        </p>
                    </div>

                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputWrapper}>
                            <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search by username, first name, or last name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch(searchQuery);
                                }
                            }}
                                className={`${baseStyles.input} ${styles.searchInput}`}
                        />
                        </div>
                        <button
                            onClick={() => handleSearch(searchQuery)}
                            disabled={usersLoading}
                            className={`${baseStyles.submitBtn} ${styles.searchBtn}`}
                        >
                            <Search size={16} />
                            {usersLoading ? 'Searching...' : 'Search'}
                        </button>
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    fetchUsers();
                                }}
                                className={styles.clearBtn}
                            >
                                <X size={16} />
                                Clear
                            </button>
                        )}
                    </div>
                </section>

                {/* Users List Section */}
                <div className={baseStyles.card} style={{ width: '100%' }}>
                    <div className={styles.usersListHeader}>
                <div>
                            <h2 className={baseStyles.title} style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {searchQuery ? `Search Results for "${searchQuery}"` : 'All Users'}
                    </h2>
                            <p className={baseStyles.subtitle} style={{ textAlign: 'left' }}>
                                {users.length} user{users.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                    </div>

                    {usersLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner} />
                            <p className={styles.loadingText}>Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Users size={48} className={styles.emptyStateIcon} />
                            <h3 className={styles.emptyStateTitle}>
                                No users found
                            </h3>
                            <p className={styles.emptyStateText}>
                                {searchQuery 
                                    ? `No users match your search for "${searchQuery}"`
                                    : 'No users available at the moment'}
                            </p>
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        fetchUsers();
                                    }}
                                    className={`${baseStyles.submitBtn} ${styles.clearSearchBtn}`}
                                >
                                    <X size={16} />
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.usersGrid}>
                            {users.map((user) => {
                                const isCurrentUser = currentUser && Number(currentUser.id) === user.id;
                                const status = friendshipStatusByUserId[user.id];
                                const hasInvitation = invitationsReceivedByUserId[user.id] === true;
                                const isPending = status === 'pending' || status === 'Pending';
                                const isBlocked = status === 'blocked' || status === 'Blocked' || status === 'blocker';
                                const isAlreadyFriend = status === 'accepted' || status === 'Friends';
                                const canAddFriend = !isCurrentUser && !isAlreadyFriend && !isPending && !isBlocked && !hasInvitation && (status === undefined || status === null || status === 'Add Friend');
                                return (
                                    <div key={user.id} className={styles.userCard}>
                                        <UserAvatar user={user} />
                                        
                                        <div className={styles.userInfo}>
                                            <div className={styles.userHeader}>
                                                <h3 className={styles.userName}>
                                                {user.first_name && user.last_name 
                                                    ? `${user.first_name} ${user.last_name}` 
                                                    : user.username}
                                            </h3>
                                                <div className={`${styles.statusBadge} ${user.is_online ? styles.statusBadgeOnline : styles.statusBadgeOffline}`}>
                                                    <Circle 
                                                        size={8} 
                                                        fill={user.is_online ? '#51cf66' : '#6b7593'}
                                                        color={user.is_online ? '#51cf66' : '#6b7593'}
                                                    />
                                                    <span className={`${styles.statusText} ${user.is_online ? styles.statusTextOnline : styles.statusTextOffline}`}>
                                                {user.is_online ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                            </div>
                                            <p className={styles.username}>
                                            @{user.username}
                                        </p>
                                            <p className={styles.joinDate}>
                                                Joined {new Date(user.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                        </p>
                                    </div>
                                    
                                        <div className={styles.userActions}>
                                        <Link
                                            href={`/users/${user.id}`}
                                                className={styles.viewBtn}
                                            >
                                                <UserIcon size={14} />
                                                View
                                        </Link>
                                        
                                            {!isCurrentUser && (
                                            <>
                                                {hasInvitation && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAcceptRequest(user)}
                                                            disabled={actionLoading === user.id}
                                                            className={styles.addFriendBtn}
                                                        >
                                                            <UserPlus size={14} />
                                                            {actionLoading === user.id ? 'Accepting...' : 'Accept'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRequest(user)}
                                                            disabled={actionLoading === user.id}
                                                            className={styles.blockBtn}
                                                        >
                                                            <UserX size={14} />
                                                            {actionLoading === user.id ? 'Rejecting...' : 'Reject'}
                                                        </button>
                                                    </>
                                                )}
                                                {!hasInvitation && canAddFriend && (
                                                    <button
                                                        onClick={() => handleAddFriend(user)}
                                                        disabled={actionLoading === user.id}
                                                        className={styles.addFriendBtn}
                                                    >
                                                        <UserPlus size={14} />
                                                        {actionLoading === user.id ? 'Sending...' : 'Add Friend'}
                                                    </button>
                                                )}
                                                {!hasInvitation && isPending && (
                                                    <button
                                                        disabled
                                                        className={styles.addFriendBtn}
                                                    >
                                                        <UserPlus size={14} />
                                                        Pending
                                                    </button>
                                                )}
                                                {!hasInvitation && isBlocked && (
                                                    <button
                                                        disabled
                                                        className={styles.addFriendBtn}
                                                    >
                                                        <UserX size={14} />
                                                        Blocked
                                                    </button>
                                                )}
                                                
                                                {!hasInvitation && (
                                                    <button
                                                        onClick={() => handleBlockUser(user)}
                                                        disabled={actionLoading === user.id}
                                                        className={styles.blockBtn}
                                                    >
                                                        <UserX size={14} />
                                                        {actionLoading === user.id ? 'Blocking...' : 'Block'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
