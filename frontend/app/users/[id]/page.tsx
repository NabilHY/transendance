'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { umGetUser, UMUser } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { ProfileCard } from '@/components/ProfileCard';
import { headers } from 'next/dist/client/components/headers';
import CurrentUserProfileNotice from '@/components/CurrentUserProfileNotice';

export default function UserDetailPage() {
    const params = useParams();
    const userId = params?.id as string;
    const { addFriend, blockUser, clearError } = useUser();
    const { loading: authLoading } = useRequireAuth();
    const [user, setUser] = useState<UMUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
    const [invitationReceived, setInvitationReceived] = useState<boolean>(false);
    const [blockerOrblocked, setBlockerOrblocked] = useState<boolean>(false);
    const router = useRouter();
    const { user: currentUser, ensureCsrf } = useAuth();

    useEffect(() => {
        console.log("---------------->");
        console.log("Fetching friendship status for user id: ", user?.id);
        fetchFriendshipStatus();
        invitationsReceived();
        console.log("Invitation received status: ", invitationReceived);        
        console.log("current friendship status: ", friendshipStatus);

    }, [currentUser, user, invitationReceived]);

    useEffect(() => {
        if (userId) {
            console.log("Fetching user for userId: ", userId);
            fetchUser();
        }
        console.log("userId changed: ", userId);
    }, [userId]);

    const invitationsReceived = async () => {
        // Implement fetching invitations if needed
        console.log("Fetching invitations received...");
        if(currentUser == null || user == null)
            return;
        try {
            // const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/friend-invitations`, {
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
                console.log("Invitations received: ", data);
            } else {
                console.warn("Failed to fetch invitations received:", data.message);
            }
        } catch (err) {
            console.error("Error fetching invitations received:", err);
        }
    };

    const acceptRequest = async () => {
        if (!user) return;

        console.log(currentUser?.id + " trying to accept friend request from: " + user.id);
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
                alert(data.message);
                setFriendshipStatus("Friends");
                setInvitationReceived(false);
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error("Failed to accept friend request:", err);
        }
    }

    const rejectRequest = async () => {
        if (!user) return;

        console.log(currentUser?.id + " trying to reject friend request from: " + user.id);
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
        // Implement fetching friendship status if needed
        console.log("Fetching friendship status...");
        if(!currentUser || !user) {
            console.log("No current user or user to fetch friendship status for.");
            console.log("currentUser ===> " + currentUser);
            console.log("user ===> " + user);
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
                // console.log("* success");
                setFriendshipStatus(data.status);
                console.log("Friendship status: ", data.status);
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
                console.log("response data: ", response.data);
                
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

    const handleAddFriend = async () => {
        if (!user) return;

        console.log(currentUser?.id + " trying to add friend: " + user.id);
        setActionLoading(true);
        try {
            const result = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/friend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user.id }),
            });
            const data = await result.json();
            console.log("* CLIENT ---> requested: ", data);
            if( result.ok )
                setFriendshipStatus("pending");
            
        } catch (err) {
            console.error("Failed to add friend:", err);
        } finally {
            setActionLoading(false);
        }
        // setActionLoading(true);
        // try {
        //     const result = await addFriend(user.id);
        //     if (result.success) {
        //         alert(result.message);
        //     } else {
        //         alert(result.message);
        //     }
        // } finally {
        //     setActionLoading(false);
        // }
    };

    const handleBlockUser = async () => {
        if (!user) return;

        if (!confirm('Are you sure you want to block this user?')) {
            return;
        }

        setActionLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: user.id }),
            });
            
            const result = await response.json();
            
            console.log("trying to block a user: ", result);
            if (result.success) {
                alert(result.message);
                // router.push('/users');
            } else {
                alert(result.message);
            }
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
        return (
            <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
                <h1>Loading...</h1>
            </main>
        );
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
        <main style={{ padding: 24, fontFamily: 'sans-serif', margin: '0 auto', background: 'radial-gradient(circle at top, rgba(20, 40, 80, 0.6), transparent 60%), #040912', minHeight: '100dvh' }}>
            
            <ProfileCard 
                profile={user} 
                onAddFriend={handleAddFriend} 
                friendshipStatus={friendshipStatus} 
                acceptRequest={acceptRequest}
                invitationReceived={invitationReceived}
                blockUser={handleBlockUser}
                rejectRequest={rejectRequest}
                handleMessageBtn={() => handleMessageBtn(user.id.toString())}
            />

            <CurrentUserProfileNotice isCurrentUser={isCurrentUser}/>

        </main>
    );
}
