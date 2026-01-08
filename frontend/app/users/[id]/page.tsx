'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { umGetUser, UMUser } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ProfileCard } from '@/components/ProfileCard';
import { headers } from 'next/dist/client/components/headers';
import { handleMessageClick } from '@/lib/chat';
import { MatchHistoryPanel } from '@/app/game/components/MatchHistoryPanel';
import { fetchPlayerStats, getAuthToken } from '@/app/game/utils/api';
import type { PlayerStats } from '@/app/game/types';
import { getUserMgmtBase } from '@/lib/api-config';
import styles from './UserProfile.module.css';

export default function UserDetailPage() {
    const params = useParams();
    const userId = params?.id as string;
    const { loading: authLoading } = useRequireAuth();
    const [user, setUser] = useState<UMUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
    const [invitationReceived, setInvitationReceived] = useState<boolean>(false);
    const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const router = useRouter();
    const { user: currentUser, ensureCsrf } = useAuth();
    const usrManagBase = getUserMgmtBase();


    useEffect(() => {
        // console.log("---------------->");
        // console.log("Fetching friendship status for user id: ", user?.id);
        fetchFriendshipStatus();
        invitationsReceived();
        // console.log("Invitation received status: ", invitationReceived);        
        // console.log("current friendship status: ", friendshipStatus);

    }, [currentUser, user, invitationReceived]);

    useEffect(() => {
        if (userId) {
            // console.log("Fetching user for userId: ", userId);
            fetchUser();
        }
        // console.log("userId changed: ", userId);
    }, [userId]);

    // Fetch authenticated player's stats once auth is ready
    useEffect(() => {
        const loadStats = async () => {
            try {
                await fetchPlayerStats(getAuthToken, setPlayerStats, setStatsError).then(() => {
                    console.log("Player stats fetched: ", playerStats);
                });
            } catch (e) {
                console.error('Failed to fetch player stats:', e);
            } finally {
                console.log("Finished fetching player stats: ", playerStats);
            }
        };
        if (!authLoading) {
            loadStats();
        }
    }, [authLoading]);

    const invitationsReceived = async () => {
        // console.log("Fetching invitations received...");
        if(currentUser == null || user == null)
            return;
        try {
            const result = await fetch(`${usrManagBase}/users/${currentUser.id}/friends/${user.id}/invitation`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            const data = await result.json();
            if (result.ok) {
                setInvitationReceived(data.status === 'false' ? false : true);
                // console.log("Invitations received: ", data);
            } else {
                console.warn("Failed to fetch invitations received:", data.message);
            }
        } catch (err) {
            console.error("Error fetching invitations received:", err);
        }
    };

    const acceptRequest = async () => {
        if (!user) return;

        // console.log(currentUser?.id + " trying to accept friend request from: " + user.id);
        try {
            const result = await fetch(`${usrManagBase}/users/${currentUser?.id}/friends/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ friendId: user.id }),
            });
            
            const data = await result.json();
            if (result.ok) {
                setFriendshipStatus("Friends");
                setInvitationReceived(false);
            }
        } catch (err) {
            console.error("Failed to accept friend request:", err);
        }
    }

    const rejectRequest = async () => {
        if (!user) return;

        try {
            const result = await fetch(`${usrManagBase}/users/${currentUser?.id}/friends/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ friendId: user.id }),
            });

            const data = await result.json();
            if (result.ok) {
                setFriendshipStatus("Add Friend");
                setInvitationReceived(false);
            }
        } catch (err) {
            console.error("Failed to accept friend request:", err);
        }
    };

    const fetchFriendshipStatus = async () => {
        // console.log("Fetching friendship status...");
        if(!currentUser || !user) {
            // console.log("No current user or user to fetch friendship status for.");
            // console.log("currentUser ===> " + currentUser);
            // console.log("user ===> " + user);
            return;
        } 
        try {
            const response = await fetch(`${usrManagBase}/users/${currentUser.id}/friends/${user.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                console.log("* success");
                setFriendshipStatus(data.status);
            } else {
                console.warn("Failed to fetch friendship status:", data.message);
            }
        } catch (err) {
            console.error("Error fetching friendship status:", err);
        }
    };

    const fetchUser = async () => {
        if (!userId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const csrfToken = await ensureCsrf();
            const response = await umGetUser(userId, csrfToken);
            
            if (response.ok) {
                
                setUser(response.data as UMUser);
            } else {
                setError('User not found');
            }
        } catch (err) {
            setError('Failed to fetch user');
            console.error('User fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async () => {
        if (!user) return;

        setActionLoading(true);
        try {
            const result = await fetch(`${usrManagBase}/users/${userId}/unblock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user?.id }),
            });
            const data = await result.json();
            if( result.ok )
                setFriendshipStatus("accepted");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddFriend = async () => {
        if (!user) return;

        setActionLoading(true);
        try {
            const result = await fetch(`${usrManagBase}/users/${userId}/friend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user?.id }),
            });
            const data = await result.json();
            // console.log("* CLIENT ---> requested: ", data);
            if( result.ok ) {
                setFriendshipStatus("pending");
                
                await fetch(`${usrManagBase}/notifications/friend-request`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        recipientId: user.id,
                        senderId: currentUser?.id 
                    }),
                });
            }
            
        } catch (err) {
            console.error("Failed to add friend:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBlockUser = async () => {
        if (!user) return;

        if (!confirm('Are you sure you want to block this user?')) {
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`${usrManagBase}/users/${userId}/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user.id }),
            });
            
            const result = await response.json();
            if (response.ok) {
                // Immediately reflect "unlisted" behavior by returning to the directory.
                // The backend now filters blocked users out of /users and private conversations.
                router.push('/users');
                router.refresh();
            }
            
            // console.log("trying to block a user: ", result);
            
        } finally {
            setActionLoading(false);
        }
    };

    const handleMessageBtn = async (userId: string) => {
        const chatURL = await handleMessageClick(userId);
        if(chatURL)
            router.push(chatURL);
    }

    if (authLoading) {
        return <LoadingScreen />;
    }

    if (error || !user) {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.matchHistoryCard}>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#e4ecff' }}>User Not Found</h1>
                            <nav style={{ display: 'flex', gap: 12 }}>
                                <Link href="/users" style={{ color: '#8c96b6', textDecoration: 'none' }}>Back to Users</Link>
                                <Link href="/" style={{ color: '#8c96b6', textDecoration: 'none' }}>Dashboard</Link>
                            </nav>
                        </header>
                        
                        <div className={styles.error}>
                            <p style={{ margin: 0 }}>{error}</p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const isCurrentUser = currentUser?.id === user.id;

    return (
        <main className={styles.page}>
            {user && playerStats !== null && (
                <div className={styles.container}>
                    <div className={styles.profileSection}>
                        <ProfileCard 
                            profile={user}
                            isCurrentUser={isCurrentUser}
                            onAddFriend={handleAddFriend}
                            friendshipStatus={friendshipStatus} 
                            acceptRequest={acceptRequest}
                            invitationReceived={invitationReceived}
                            blockUser={handleBlockUser}
                            rejectRequest={rejectRequest}
                            handleMessageBtn={() => handleMessageBtn(user.id.toString())}
                            handleUnblock={handleUnblock}
                            playerStats={playerStats}
                        />
                    </div>

                    <div className={styles.contentSection}>
                        <div className={styles.matchHistoryCard}>
                            <h2 className={styles.matchHistoryTitle}>Match History</h2>
                            <MatchHistoryPanel
                                userId={typeof user.id === 'number' ? user.id : parseInt(user.id)}
                                isVisible={true}
                                isGamePage={false}
                            />
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
