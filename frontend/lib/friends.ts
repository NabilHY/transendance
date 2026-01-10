import { UMUser } from "./api";
import { getApiUrls } from "./api-config";

type Setter<T> = (value: T) => void;

export const invitationsReceived = async (
    user: UMUser | null,
    currentUser: any,
    setInvitationReceived: Setter<boolean>,
) => {
    // console.log("Fetching invitations received...");
    if(currentUser == null || user == null)
        return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    try {
        const result = await fetch(`${base}/users/${currentUser.id}/friends/${user.id}/invitation`, {
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

export const acceptRequest = async (
    user: UMUser | null,
    currentUser: any,
    setFriendshipStatus: Setter<string | null>,
    setInvitationReceived: Setter<boolean>,
) => {
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    // console.log(currentUser?.id + " trying to accept friend request from: " + user.id);
    try {
        const result = await fetch(`${base}/users/${currentUser?.id}/friends/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ friendId: user.id }),
        });
        
        await result.json();
        if (result.ok) {
            setFriendshipStatus("Friends");
            setInvitationReceived(false);
        }
    } catch (err) {
        console.error("Failed to accept friend request:", err);
    }
}

export const rejectRequest = async (
    user: UMUser | null,
    currentUser: any,
    setFriendshipStatus: Setter<string | null>,
    setInvitationReceived: Setter<boolean>,
) => {
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    try {
        const result = await fetch(`${base}/users/${currentUser?.id}/friends/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ friendId: user.id }),
        });

        await result.json();
        if (result.ok) {
            setFriendshipStatus("Add Friend");
            setInvitationReceived(false);
        }
    } catch (err) {
        console.error("Failed to accept friend request:", err);
    }
};

export const fetchFriendshipStatus = async (
    user: UMUser | null,
    currentUser: any,
    setFriendshipStatus: Setter<string | null>,
) => {
    // console.log("Fetching friendship status...");
    if(!currentUser || !user) {
        // console.log("No current user or user to fetch friendship status for.");
        // console.log("currentUser ===> " + currentUser);
        // console.log("user ===> " + user);
        return;
    }

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    try {
        const response = await fetch(`${base}/users/${currentUser.id}/friends/${user.id}`, {
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

export const handleUnblock = async (
    user: UMUser | null,
    userId: string,
    setActionLoading: Setter<boolean>,
    setFriendshipStatus: Setter<string | null>,
) => {
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    setActionLoading(true);
    try {
        const result = await fetch(`${base}/users/${userId}/unblock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: user?.id }),
        });
        await result.json();
        if( result.ok )
            setFriendshipStatus("accepted");
    } finally {
        setActionLoading(false);
    }
};

export const handleAddFriend = async (
    user: UMUser | null,
    userId: string,
    currentUser: any,
    setActionLoading: Setter<boolean>,
    setFriendshipStatus: Setter<string | null>,
) => {
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    setActionLoading(true);
    try {
        const result = await fetch(`${base}/users/${userId}/friend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: user?.id }),
        });
        await result.json();
        // console.log("* CLIENT ---> requested: ", data);
        if( result.ok ) {
            setFriendshipStatus("pending");
            
            await fetch(`${base}/notifications/friend-request`, {
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

export const handleBlockUser = async (
    user: UMUser | null,
    userId: string,
    setActionLoading: Setter<boolean>,
    confirmFn: (message: string) => boolean = confirm,
) => {
    if (!user) return;

    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    if (!confirmFn('Are you sure you want to block this user?')) {
        return;
    }

    setActionLoading(true);
    try {
        const response = await fetch(`${base}/users/${userId}/block`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ id: user.id }),
        });
        
        await response.json();
        
        // console.log("trying to block a user: ", result);
        
    } finally {
        setActionLoading(false);
    }
};