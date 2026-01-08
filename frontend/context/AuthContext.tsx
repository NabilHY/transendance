'use client';

import { useRouter } from 'next/navigation';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { UMUser, isProfileComplete, umGetMe, umProfileComplete, umUpdateStatus } from '@/lib/api';
import { getUserMgmtBase } from '@/lib/api-config';

// Dynamic API base URL:
// - Dev: talk directly to auth-backend on :8005
// - Prod (behind nginx TLS): talk to public origin and let nginx route /api/auth/*
const getApiBase = () => {
	if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
		return process.env.NEXT_PUBLIC_BASE_URL;
	}
	if (typeof window !== 'undefined') {
		return `http://${window.location.hostname}:8005`;
	}
	return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8005';
};

type AuthUser = {
	id: number | string;
	email?: string;
};

type AuthContextValue = {
	csrfToken: string | null;
	user: AuthUser | null;
	isLoggedIn: boolean;
	requires2FA: boolean;
	loading: boolean;
	error: string | null;
	profileCheckRedirect: string | null;
	profileComplete: boolean;
	checkingProfileCompletion: boolean;
	checkProfileAndRedirect: () => Promise<string>;
	checkProfileCompletion: () => Promise<boolean>;
	ensureCsrf: () => Promise<string | null>;
	fetchMe: () => Promise<void>;
	login: (email: string, password: string) => Promise<{ requires2FA?: boolean } | void>;
	login2fa: (token: string) => Promise<void>;
	logout: () => Promise<void>;
	cancelTwoFA: () => void;
	refresh: () => Promise<void>;
	clearError: () => void;
	checkOAuth2FA: () => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isJsonContentType(headers: HeadersInit | undefined): boolean {
	if (!headers) return false;
	const map = new Headers(headers as HeadersInit);
	const value = map.get('Content-Type');
	return !!value && value.toLowerCase().includes('application/json');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [csrfToken, setCsrfToken] = useState<string | null>(null);
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [requires2FA, setRequires2FA] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [profileCheckRedirect, setProfileCheckRedirect] = useState<string | null>(null);
	const initializingRef = useRef<boolean>(true);
	
	const [profileComplete, setProfileComplete] = useState<boolean>(false);
	const [checkingProfileCompletion, setCheckingProfileCompletion] = useState<boolean>(false);
	const fetchMeInProgressRef = useRef<boolean>(false);
	
	const ensureCsrf = useCallback(async (): Promise<string | null> => {
		if (csrfToken) return csrfToken;
		try {
			const res = await fetch(`${getApiBase()}/api/csrf-token`, { credentials: 'include' });
			const json = await res.json();
			if (res.ok && json?.csrfToken) {
				setCsrfToken(json.csrfToken);
				return json.csrfToken as string;
			}
			setError(json?.error || 'Failed to obtain CSRF token');
			return null;
		} catch (e: any) {
			setError(e?.message || 'Failed to obtain CSRF token');
			return null;
		}
	}, [csrfToken]);
	
	const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
		const url = `${getApiBase()}${path}`;
		const headers: HeadersInit = new Headers(options.headers);
		if (csrfToken) {
			(headers as Headers).set('X-CSRF-Token', csrfToken);
		}
		// Only set JSON content type if there is a body
		if (options.body && !isJsonContentType(headers)) {
			(headers as Headers).set('Content-Type', 'application/json');
		}
		
		const response = await fetch(url, {
			credentials: 'include',
			...options,
			headers,
		});

		// If we get a 401 and this isn't already a refresh request, try to refresh token
		if (response.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
			console.log('🔄 Token expired, attempting automatic refresh...');
			try {
				const csrf = await ensureCsrf();
				const refreshRes = await fetch(`${getApiBase()}/api/auth/refresh`, {
					method: 'POST',
					credentials: 'include',
					headers: csrf ? { 'X-CSRF-Token': csrf } : {},
				});
				
				if (refreshRes.ok) {
					console.log('✅ Token refreshed successfully, retrying original request...');
					// Retry the original request with fresh token
					const retryRes = await fetch(url, {
						credentials: 'include',
						...options,
						headers,
					});
					
					let retryData: any = null;
					try {
						retryData = await retryRes.json();
					} catch (_e) {
						retryData = null;
					}
					
					return { response: retryRes, data: retryData } as const;
				} else {
					console.log('❌ Token refresh failed, user needs to login again');
				}
			} catch (e) {
				console.log('💥 Error during token refresh:', e);
			}
		}

		let data: any = null;
		try {
			data = await response.json();
		} catch (_e) {
			// ignore non-JSON
		}
		return { response, data } as const;
	}, [csrfToken, ensureCsrf]);
	
	const router = useRouter();
	
	const checkProfileCompletion = useCallback( async (): Promise<boolean> => {
		console.log(' +++ Check Profile Completion +++');
		setCheckingProfileCompletion(true);
		
		try {
			const csrf = await ensureCsrf();
			const res = await umProfileComplete(csrf);
			const isComplete = res.ok && (res.data as any)?.complete;
			setProfileComplete(!!isComplete);
			return isComplete;
		} catch (error) {
			setProfileComplete(false);
			return false;
		} finally {
			setCheckingProfileCompletion(false);
		}
	}, [ensureCsrf])

	const checkProfileAndRedirect = useCallback(async () => {
		console.log('+++ checkProfileAndRedirect +++');
		const isComplete = await checkProfileCompletion();
		const dest = isComplete ? '/' : '/complete-profile';
		router.replace(dest);
		return dest;
	}, [checkProfileCompletion, router]);
	

	const checkPre2FAToken = useCallback(() => {
		// Check if we have a pre2faToken cookie (indicates 2FA is required)
		if (typeof document !== 'undefined') {
			const cookies = document.cookie.split(';');
			const pre2faCookie = cookies.find(cookie => 
				cookie.trim().startsWith('pre2faToken=')
			);
			console.log('🔍 [OAuth Debug] All cookies:', document.cookie);
			console.log('🔍 [OAuth Debug] Looking for pre2faToken cookie');
			if (pre2faCookie) {
				console.log('🔍 [OAuth Debug] pre2faCookie found:', pre2faCookie, 'setting requires2FA to true');
				setRequires2FA(true);
				setIsLoggedIn(false); // Ensure we're not marked as logged in during 2FA flow
				return true;
			} else {
				console.log('🔍 [OAuth Debug] no pre2faCookie found');
				// If we're on /twofa page with oauth=true, still consider it OAuth flow
				if (window.location.pathname === '/twofa' && window.location.search.includes('oauth=true')) {
					console.log('🔍 [OAuth Debug] On /twofa page with oauth=true, treating as OAuth flow');
					setRequires2FA(true);
					setIsLoggedIn(false);
					return true;
				}
				return false;
			}
		}
		return false;
	}, []);

	const fetchMe = useCallback(async () => {
		// Prevent concurrent calls
		if (fetchMeInProgressRef.current) {
			console.log('⏳ fetchMe already in progress, skipping...');
			return;
		}
		
		fetchMeInProgressRef.current = true;
		try {
			console.log('🚀 [OAuth Debug] fetchMe called');
			
			// FIRST: Check if we have a pre2faToken (from OAuth flow)
			// If we do, don't call /api/auth/me since we don't have a valid access token yet
			if (checkPre2FAToken()) {
				console.log('🛑 [OAuth Debug] pre2faToken found, skipping /api/auth/me call');
				const pre2faToken = document.cookie.split(';').find(cookie => 
					cookie.trim().startsWith('pre2faToken=')
				)?.split('=')[1];
				console.log('🛑 [OAuth Debug] pre2faToken:', pre2faToken);
				return; // Stop here, we're in 2FA flow - NO /api/auth/me call!
			}
		
			console.log('📡 [OAuth Debug] No pre2faToken, calling /api/auth/me');
			await ensureCsrf();
			const { response, data } = await apiFetch('/api/auth/me');
			console.log(' [OAuth Debug] /api/auth/me response:', response.status, data);
			if (response.ok && data?.userId != null) {
				console.log('✅ [OAuth Debug] User authenticated, setting logged in');
				setUser({ id: data.userId });
				setIsLoggedIn(true);
				setRequires2FA(false);
				
				// Set user online when authenticated (handles OAuth login and page refresh)
				try {
					const csrf = await ensureCsrf();
					await umUpdateStatus(true, csrf);
				} catch (err) {
					console.error('Failed to set online status in fetchMe:', err);
					// Don't block authentication if this fails
				}
				
				return;
			}
			// Not logged in or missing CSRF
			console.log('❌ [OAuth Debug] Not authenticated, setting logged out');
			setIsLoggedIn(false);
			setUser(null);
		} catch (e: any) {
			console.log('💥 [OAuth Debug] Error in fetchMe:', e);
			setIsLoggedIn(false);
			setUser(null);
		} finally {
			fetchMeInProgressRef.current = false;
		}
	}, [apiFetch, ensureCsrf, checkPre2FAToken]);

	const login = useCallback(async (email: string, password: string) => {
		setError(null);
		setRequires2FA(false);
		await ensureCsrf();
		const { response, data } = await apiFetch('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		});
		if (!response.ok) {
			setIsLoggedIn(false);
			setUser(null);
			// Prefer backend-provided, descriptive errors and enrich with context
			let message = (data?.error || data?.message || `Login failed (HTTP ${response.status})`) as string;
			
			if (response.status === 403 && data?.requiresEmailVerification) {
				setError('Please verify your email before logging in.');
				return;
			}
			
			if (response.status === 401 && typeof (data as any)?.remainingAttempts === 'number') {
				message += ` (Remaining attempts: ${((data as any).remainingAttempts as number)})`;
			}
			
			if (response.status === 423 && (data as any)?.lockedUntil) {
				try {
					const dt = new Date((data as any).lockedUntil);
					if (!isNaN(dt.getTime())) message += ` (Locked until ${dt.toLocaleString()})`;
				} catch (_e) {}
			}
			
			setError(message);
			return;
		}
		if (data?.requires2FA) {
			setRequires2FA(true);
			setIsLoggedIn(false);
			return { requires2FA: true } as const;
		}
		if (data?.user) {
			setUser({ id: data.user.id, email: data.user.email });
			setIsLoggedIn(true);
			setRequires2FA(false);

			// Set user online when they log in
			try {
				const csrf = await ensureCsrf();
				await umUpdateStatus(true, csrf);
			} catch (err) {
				console.error('Failed to set online status on login:', err);
				// Don't block login if this fails
			}

			await checkProfileCompletion();
			await checkProfileAndRedirect();
		}
	}, [apiFetch, ensureCsrf, checkProfileCompletion, checkProfileAndRedirect]);

	const login2fa = useCallback(async (token: string) => {
		setError(null);
		await ensureCsrf();
		const { response, data } = await apiFetch('/api/auth/login/2fa', {
			method: 'POST',
			body: JSON.stringify({ token }),
		});
		if (!response.ok) {
			setIsLoggedIn(false);
			setUser(null);
			setError(data?.error || data?.message || `2FA verification failed (HTTP ${response.status})`);
			return;
		}
		if (data?.user) {
			setUser({ id: data.user.id, email: data.user.email });
			setIsLoggedIn(true);
			setRequires2FA(false);

			// Set user online when they complete 2FA login
			try {
				const csrf = await ensureCsrf();
				await umUpdateStatus(true, csrf);
			} catch (err) {
				console.error('Failed to set online status on 2FA login:', err);
				// Don't block login if this fails
			}

			await checkProfileAndRedirect();
		}
	}, [apiFetch, ensureCsrf]);

	const logout = useCallback(async () => {
		setError(null);
		
		// Set user offline BEFORE logging out
		try {
			const csrf = await ensureCsrf();
			await umUpdateStatus(false, csrf);
		} catch (err) {
			console.error('Failed to set offline status on logout:', err);
			// Continue with logout even if this fails
		}
		
		await ensureCsrf();
		const { response, data } = await apiFetch('/api/auth/logout', {
			method: 'POST',
			// No body to avoid setting Content-Type
		});
		if (!response.ok) {
			setError(data?.error || data?.message || `Logout failed (HTTP ${response.status})`);
		}
		setIsLoggedIn(false);
		setUser(null);
		setRequires2FA(false);
	}, [apiFetch, ensureCsrf]);

	const refresh = useCallback(async () => {
		setError(null);
		await ensureCsrf();
		const { response, data } = await apiFetch('/api/auth/refresh', {
			method: 'POST',
		});
		if (!response.ok) {
			setError(data?.error || data?.message || `Refresh failed (HTTP ${response.status})`);
			setIsLoggedIn(false);
			setUser(null);
			return;
		}
		// After refresh, try to update user from /me
		await fetchMe();
	}, [apiFetch, ensureCsrf, fetchMe]);

	const cancelTwoFA = useCallback(() => {
		try {
			if (typeof document !== 'undefined') {
				document.cookie = 'pre2faToken=; Max-Age=0; path=/';
			}
		} catch (_e) {}
		setRequires2FA(false);
		setIsLoggedIn(false);
		setUser(null);
		setError(null);
	}, []);
	
	const verifyEmail = useCallback(async (token: string) => {
		setError(null);
		await ensureCsrf();
		const { response, data } = await apiFetch('/api/auth/verify-email/request', {
			method: 'POST',
			body: JSON.stringify({ token }),
		});
	}, [apiFetch, ensureCsrf]);

	const clearError = useCallback(() => setError(null), []);

	const checkOAuth2FA = useCallback(() => {
		return checkPre2FAToken();
	}, [checkPre2FAToken]);

	useEffect(() => {
		(async () => {
			try {
				console.log('🔄 [OAuth Debug] AuthContext initialization starting');
				// First check if we're in an OAuth 2FA flow
				if (checkPre2FAToken()) {
					console.log('🔄 [OAuth Debug] Detected OAuth 2FA flow on startup');
					setLoading(false);
					return;
				}
				
				console.log('🔄 [OAuth Debug] No OAuth 2FA flow detected, proceeding with normal auth check');
				await ensureCsrf();
				await fetchMe();
			} finally {
				initializingRef.current = false;
				setLoading(false);
			}
		})();
	}, [ensureCsrf, fetchMe, checkPre2FAToken]);

	// Handle page unload (browser close, tab close, navigation away) to set user offline
	useEffect(() => {
		if (!isLoggedIn) return;

		const handlePageHide = (e: PageTransitionEvent) => {
			// Page is being unloaded
			if (e.persisted === false) {
				// Page is not being cached (user is actually leaving)
				const endpoint = `${getUserMgmtBase()}/me/status/unload`;
				
				// Use fetch with keepalive for reliable delivery during page unload
				// keepalive ensures the request continues even after page unloads
				fetch(endpoint, {
					method: 'PATCH',
					credentials: 'include',
					keepalive: true,
				}).catch(() => {
					// Ignore errors - page is unloading
				});
			}
		};

		const handleVisibilityChange = () => {
			// When tab becomes hidden, try to set offline
			// This handles cases where the browser might not fire pagehide
			if (document.visibilityState === 'hidden') {
				const endpoint = `${getUserMgmtBase()}/me/status/unload`;
				
				fetch(endpoint, {
					method: 'PATCH',
					credentials: 'include',
					keepalive: true,
				}).catch(() => {
					// Ignore errors
				});
			}
		};

		window.addEventListener('pagehide', handlePageHide);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			window.removeEventListener('pagehide', handlePageHide);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [isLoggedIn]);

	const value: AuthContextValue = useMemo(() => ({
		csrfToken,
		user,
		isLoggedIn,
		requires2FA,
		loading,
		error,
		profileCheckRedirect,
		profileComplete,
		checkingProfileCompletion,
		checkProfileAndRedirect,
		checkProfileCompletion,
		ensureCsrf,
		fetchMe,
		login,
		login2fa,
		logout,
		cancelTwoFA,
		refresh,
		clearError,
		checkOAuth2FA,
		verifyEmail,
	}), [
		csrfToken,
		user,
		isLoggedIn,
		requires2FA,
		loading,
		error,
		profileCheckRedirect,
		profileComplete,
		checkingProfileCompletion,
		checkProfileAndRedirect,
		checkProfileCompletion,
		ensureCsrf,
		fetchMe,
		login,
		login2fa,
		logout,
		cancelTwoFA,
		refresh,
		clearError,
		checkOAuth2FA,
		verifyEmail,
	]);

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return ctx;
}
