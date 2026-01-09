'use client';

// UseRequireAuth  - redirect to login if not authenticated
// UseRequireGuest - redirect to home if authenticated
// userRequireProfileComplete - redirect to complete profile if profile is not complete

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {umProfileComplete} from '@/lib/api';

// hook should return the following types:
type AuthGuardResult = {
    loading: boolean;
    isAuthenticated: boolean;
    isProfileComplete:boolean;
}

// hook for pages that require authentication.
export function useRequireAuth(): AuthGuardResult {
    const { isLoggedIn, loading, ensureCsrf, refresh } = useAuth();
    const router = useRouter();
    const [isProfileCompleted, setIsProfileCompleted] = useState<boolean>(false);
    const [profileLoading, setProfileLoading] = useState<boolean>(false);
    const [refreshAttempted, setRefreshAttempted] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    
    // Attempt token refresh when not logged in
    // First check if we have accessToken, if not then try refreshToken
    useEffect(() => {
        if (loading || isLoggedIn || refreshAttempted || isRefreshing) {
            return;
        }
        
        // First check if accessToken exists - give fetchMe a chance to validate it
        const hasAccessToken = typeof document !== 'undefined' 
            ? document.cookie.split(';').some(cookie => cookie.trim().startsWith('accessToken='))
            : false;
        
        // If we have accessToken, wait a bit for fetchMe to complete validation
        // The AuthContext fetchMe will attempt refresh if accessToken is invalid
        if (hasAccessToken) {
            const timeoutId = setTimeout(() => {
                if (!isLoggedIn && !refreshAttempted) {
                    attemptRefresh();
                }
            }, 500);
            return () => clearTimeout(timeoutId);
        } else {
            // No accessToken, check for refreshToken and attempt refresh
            attemptRefresh();
        }
        
        function attemptRefresh() {
            const hasRefreshToken = typeof document !== 'undefined' 
                ? document.cookie.split(';').some(cookie => cookie.trim().startsWith('refreshToken='))
                : false;
            
            if (hasRefreshToken) {
                setRefreshAttempted(true);
                setIsRefreshing(true);
                refresh()
                    .then(() => {
                        setIsRefreshing(false);
                    })
                    .catch(() => {
                        setIsRefreshing(false);
                    });
            } else {
                // No refreshToken, mark as attempted so we can redirect
                setRefreshAttempted(true);
            }
        }
    }, [loading, isLoggedIn, refresh, refreshAttempted, isRefreshing]);
    
    // Redirect to login if refresh failed or no refreshToken available
    useEffect(() => {
        if (!loading && !isRefreshing && refreshAttempted && !isLoggedIn) {
            router.replace('/login');
        }
    }, [loading, isRefreshing, refreshAttempted, isLoggedIn, router]);
    
    const checkProfileCompletion = useCallback(async () => {
        setProfileLoading(true);
        try {
            const crsfToken = await ensureCsrf();
            const result = await umProfileComplete(crsfToken);
            const complete = result.ok && (result.data as any)?.complete;
            setIsProfileCompleted(!!complete);
        } catch (error) {
            console.error('Error checking profile completion:', error);
            setIsProfileCompleted(false);
        } finally {
            setProfileLoading(false);
        }
    }, [ensureCsrf]);
    
    // Check profile completion when logged in
    useEffect(() => {
        if (!loading && isLoggedIn) {
            checkProfileCompletion();
        }
    }, [loading, isLoggedIn, checkProfileCompletion]);
    
    return {
        loading: loading || profileLoading || isRefreshing,
        isAuthenticated: isLoggedIn,
        isProfileComplete: isProfileCompleted,
    }
}

// hook for pages that should only be accessible to guests (not authenticated).
export function useRequireGuest(): AuthGuardResult {
    const {isLoggedIn, loading} = useAuth();
    
    const router = useRouter();
    
    useEffect(() => {
        if (!loading && isLoggedIn) {
            router.replace('/');
        }
    }, [loading, isLoggedIn, router]);
    
    return {
        loading,
        isAuthenticated: isLoggedIn,
        isProfileComplete: false,
    }
}

// hook for pages that require a complete profile.
export function useRequireProfileComplete(): AuthGuardResult {
    const { isLoggedIn, loading, ensureCsrf, refresh } = useAuth();
    const router = useRouter();
    const [ isProfileComplete, setIsProfileComplete ] = useState<boolean>(false);
    const [ profileLoading, setProfileLoading ] = useState<boolean>(false);
    const [ refreshAttempted, setRefreshAttempted ] = useState<boolean>(false);
    const [ isRefreshing, setIsRefreshing ] = useState<boolean>(false);
    
    // Attempt token refresh when not logged in
    // First check if we have accessToken, if not then try refreshToken
    useEffect(() => {
        if (loading || isLoggedIn || refreshAttempted || isRefreshing) {
            return;
        }
        
        // First check if accessToken exists - give fetchMe a chance to validate it
        const hasAccessToken = typeof document !== 'undefined' 
            ? document.cookie.split(';').some(cookie => cookie.trim().startsWith('accessToken='))
            : false;
        
        // If we have accessToken, wait a bit for fetchMe to complete validation
        // The AuthContext fetchMe will attempt refresh if accessToken is invalid
        if (hasAccessToken) {
            const timeoutId = setTimeout(() => {
                if (!isLoggedIn && !refreshAttempted) {
                    attemptRefresh();
                }
            }, 500);
            return () => clearTimeout(timeoutId);
        } else {
            // No accessToken, check for refreshToken and attempt refresh
            attemptRefresh();
        }
        
        function attemptRefresh() {
            const hasRefreshToken = typeof document !== 'undefined' 
                ? document.cookie.split(';').some(cookie => cookie.trim().startsWith('refreshToken='))
                : false;
            
            if (hasRefreshToken) {
                setRefreshAttempted(true);
                setIsRefreshing(true);
                refresh()
                    .then(() => {
                        setIsRefreshing(false);
                    })
                    .catch(() => {
                        setIsRefreshing(false);
                    });
            } else {
                // No refreshToken, mark as attempted so we can redirect
                setRefreshAttempted(true);
            }
        }
    }, [loading, isLoggedIn, refresh, refreshAttempted, isRefreshing]);
    
    // Redirect to login if refresh failed or no refreshToken available
    useEffect(() => {
        if (!loading && !isRefreshing && refreshAttempted && !isLoggedIn) {
            router.replace('/login');
        }
    }, [loading, isRefreshing, refreshAttempted, isLoggedIn, router]);
    
    const checkProfileCompletion = useCallback(async () => {
        setProfileLoading(true);
        try {
            const crsfToken = await ensureCsrf();
            const result = await umProfileComplete(crsfToken);
            const complete = result.ok && (result.data as any)?.complete;
            setIsProfileComplete(!!complete);
        } catch (error) {
            console.error('Error checking profile completion:', error);
            setIsProfileComplete(false);
        } finally {
            setProfileLoading(false);
        }
    }, [ensureCsrf]);
    
    // Check profile completion when logged in
    useEffect(() => {
        if (!loading && isLoggedIn) {
            checkProfileCompletion();
        }
    }, [loading, isLoggedIn, checkProfileCompletion]);
    
    // Separate useEffect to handle redirect when profile is incomplete
    useEffect(() => {
        if (!loading && !profileLoading && isLoggedIn && !isProfileComplete) {
            router.replace('/complete-profile');
        }
    }, [loading, profileLoading, isLoggedIn, isProfileComplete, router]);
    
    return {
        loading: loading || profileLoading || isRefreshing,
        isAuthenticated: isLoggedIn,
        isProfileComplete,
    }
    
}

export function useAuthState(): AuthGuardResult {
    const { isLoggedIn, loading, ensureCsrf } = useAuth();
    const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true);
    const [profileLoading, setProfileLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!loading && isLoggedIn) {
            checkProfileCompletion();
            return;
        }
    }, [loading, isLoggedIn]);

    const checkProfileCompletion = async () => {
        setProfileLoading(true);
        try {
            const csrfToken = await ensureCsrf();
            const result = await umProfileComplete(csrfToken);
            const complete = result.ok && (result.data as any)?.complete;
            setIsProfileComplete(!!complete);
        } catch (error) {
            console.error('Profile completion check failed:', error);
            setIsProfileComplete(false);
        } finally {
            setProfileLoading(false);
        }
    };

    return {
        loading: loading || profileLoading,
        isAuthenticated: isLoggedIn,
        isProfileComplete,
    };
}