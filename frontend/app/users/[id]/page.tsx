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
import CurrentUserProfileNotice from '@/components/CurrentUserProfileNotice';
import { handleMessageClick } from '@/lib/chat';
import { MatchHistoryPanel } from '@/app/game/components/MatchHistoryPanel';
import '../../game/styles.module.css';
import { fetchPlayerStats, getAuthToken } from '@/app/game/utils/api';
import type { PlayerStats } from '@/app/game/types';

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
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser.id}/friends/${user.id}/invitation`, {
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
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/friends/accept`, {
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
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/friends/reject`, {
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser.id}/friends/${user.id}`, {
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
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${userId}/unblock`, {
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
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${userId}/friend`, {
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
                
                await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications/friend-request`, {
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${userId}/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user.id }),
            });
            
            const result = await response.json();
            
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
            <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>User Not Found</h1>
                    <nav style={{ display: 'flex', gap: 12 }}>
                        <Link href="/users">Back to Users</Link>
                        <Link href="/">Dashboard</Link>
                    </nav>
                </header>
                
                <div style={{ 
                    border: '1px solid #fcc', 
                    padding: 16, 
                    borderRadius: 4,
                    background: '#fee',
                    marginTop: 24
                }}>
                    <p style={{ color: 'crimson', margin: 0 }}>{error}</p>
                </div>
            </main>
        );
    }

    const isCurrentUser = currentUser?.id === user.id;

    return (
        //   background: radial-gradient(circle at top, rgba(20, 40, 80, 0.6), transparent 60%), #040912;
        <main
            style={{
                padding: 24,
                fontFamily: 'sans-serif',
                margin: '0 auto',
                background: 'radial-gradient(circle at top, rgba(20, 40, 80, 0.6), transparent 60%), #040912',
                minHeight: '100dvh',
                // Provide the neon theme variables expected by MatchHistoryPanel styles
                '--neon-blue': '#00f0ff',
                '--neon-purple': '#b744ff',
                '--neon-pink': '#ff006e',
                '--neon-green': '#00ff88',
                '--dark-bg': '#0a0e1a',
                '--darker-bg': '#050811',
                '--card-bg': 'rgba(15, 20, 35, 0.85)',
            }}
        >
            {user && playerStats !== null && (
                <>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24}}>
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

                        <MatchHistoryPanel
                            userId={typeof user.id === 'number' ? user.id : parseInt(user.id)}
                            isVisible={true}
                            isGamePage={false}
                        />

                    </div>
                
                    <CurrentUserProfileNotice isCurrentUser={isCurrentUser}/>
                </>
            )}

        </main>
    );
}
