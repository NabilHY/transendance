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
import {
    invitationsReceived,
    acceptRequest,
    rejectRequest,
    fetchFriendshipStatus,
    handleUnblock,
    handleAddFriend,
    handleBlockUser
} from '@/lib/friends';

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
        fetchFriendshipStatus(user, currentUser, setFriendshipStatus);
        invitationsReceived(user, currentUser, setInvitationReceived);
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


    const handleMessageBtn = async (userId: string) => {
        const chatURL = await handleMessageClick(userId);
        if(chatURL)
            router.push(chatURL);
    }

    const acceptRequestHandler = async () => {
        await acceptRequest(user, currentUser, setFriendshipStatus, setInvitationReceived);
    };

    const rejectRequestHandler = async () => {
        await rejectRequest(user, currentUser, setFriendshipStatus, setInvitationReceived);
    };

    const handleUnblockHandler = async () => {
        await handleUnblock(user, userId, setActionLoading, setFriendshipStatus);
    };

    const handleAddFriendHandler = async () => {
        await handleAddFriend(user, userId, currentUser, setActionLoading, setFriendshipStatus);
    };

    const handleBlockUserHandler = async () => {
        await handleBlockUser(user, userId, setActionLoading);
    };

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
                            onAddFriend={handleAddFriendHandler}
                            friendshipStatus={friendshipStatus} 
                            acceptRequest={acceptRequestHandler}
                            invitationReceived={invitationReceived}
                            blockUser={handleBlockUserHandler}
                            rejectRequest={rejectRequestHandler}
                            handleMessageBtn={() => handleMessageBtn(user.id.toString())}
                            handleUnblock={handleUnblockHandler}
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
