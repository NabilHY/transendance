// Dynamic API base URL:
// - Dev: talk directly to auth-backend on :8005
// - Prod (behind nginx TLS): talk to the public origin (no port) and let nginx route /api/auth/*
const getApiBase = () => {
	// In browser, prefer nginx public origin when provided
	if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
		return process.env.NEXT_PUBLIC_BASE_URL;
	}
	// Dev fallback: direct to auth-backend port
	if (typeof window !== 'undefined') {
		return `http://${window.location.hostname}:8005`;
	}
	// Server-side: env variable or localhost
	return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8005';
};

const API_BASE = getApiBase();

export type ApiResult<T = any> = {
	ok: boolean;
	status: number;
	data: T | { error?: string } | null;
};

/* === Email password resets === */

export type UpdateProfileBody = {
	username?: string;
	first_name?: string;
	last_name?: string;
	profile_pic?: string;
};

// Password Reset Types
export type ResetPasswordBody = {
	oldPassword: string;
	newPassword: string;
};

export type ResetPasswordResponse = {
	message: string;
};

// Email Reset Types
export type ResetEmailBody = {
	email: string;
};

export type ResetEmailResponse = {
	message: string;
};

export type ConfirmEmailResetBody = {
	token: string;
};

export type ConfirmEmailResetResponse = {
	message: string;
};

export type VerifyEmailBody = {
	token: string;
}

export type VerifyEmailResponse = {
	message?: string;
	error?: string;
}

export type DeleteAccountBody = {
	password: string;
}


export type DeleteAccountResponse = {
	message: string;
}

/* === Connected Accounts Types === */

export type ConnectedAccount = {
	provider: string;
	id: string;
	email: string;
}

export type ConnectedAccountsResponse = {
	accounts: ConnectedAccount[];
}

export type DisconnectAccountResponse = {
	message: string;
}

/* === Delete Account === */

export async function deleteAccount(
	body: DeleteAccountBody,
	csrfToken?: string | null
) : Promise<ApiResult<DeleteAccountResponse>> {
	return fetchJson<DeleteAccountResponse>('/api/auth/delete-user', {
		method: 'DELETE',
		body: JSON.stringify(body),
	}, csrfToken);
}

export async function resetPassword(
	body: ResetPasswordBody, 
	csrfToken?: string | null
  ): Promise<ApiResult<ResetPasswordResponse>> {
	return fetchJson<ResetPasswordResponse>('/api/auth/reset-password', {
	  method: 'PATCH',
	  body: JSON.stringify(body),
	}, csrfToken);
  }

  export async function resetEmail(
	body: ResetEmailBody, 
	csrfToken?: string | null
  ): Promise<ApiResult<ResetEmailResponse>> {
	return fetchJson<ResetEmailResponse>('/api/auth/email-reset', {
	  method: 'PATCH',
	  body: JSON.stringify(body),
	}, csrfToken);
  }
  
  export async function confirmEmailReset(
	body: ConfirmEmailResetBody, 
	csrfToken?: string | null
  ): Promise<ApiResult<ConfirmEmailResetResponse>> {
	return fetchJson<ConfirmEmailResetResponse>('/api/auth/email-reset/confirm', {
	  method: 'POST',
	  body: JSON.stringify(body),
	}, csrfToken);
  }
  
  export async function verifyEmail(
    body: VerifyEmailBody,
    csrfToken?: string | null
  ): Promise<ApiResult<VerifyEmailResponse>> {
    return fetchJson<VerifyEmailResponse>('/api/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }, csrfToken);
  }

  
  //*  === Connected Accounts ===  *//
  export async function getConnectedAccounts(csrfToken?: string | null): Promise<ApiResult<ConnectedAccountsResponse>> {
	return fetchJson<ConnectedAccountsResponse>('/api/auth/connected-accounts', {}, csrfToken);
  }

  export async function disconnectAccount(provider: string, csrfToken?: string | null): Promise<ApiResult<DisconnectAccountResponse>> {
	return fetchJson<DisconnectAccountResponse>(`/api/auth/connected-accounts/${provider}`, {
		method: 'DELETE',
	}, csrfToken);
  }

  export function connectGoogleAccount(): void {
	const apiBase = API_BASE;
	window.location.href = `${apiBase}/api/auth/google?connect=true`;
  }
  
  
/* ====== */

function isJsonContentType(headers: HeadersInit | undefined): boolean {
	if (!headers) return false;
	const map = new Headers(headers as HeadersInit);
	const value = map.get('Content-Type');
	return !!value && value.toLowerCase().includes('application/json');
}

async function fetchJson<T = any>(path: string, options: RequestInit = {}, csrfToken?: string | null): Promise<ApiResult<T>> {
	const url = `${getApiBase()}${path}`;
	const headers: HeadersInit = new Headers(options.headers);
	if (csrfToken) {
		(headers as Headers).set('X-CSRF-Token', csrfToken);
	}
	if (options.body && !isJsonContentType(headers)) {
		(headers as Headers).set('Content-Type', 'application/json');
	}

	const res = await fetch(url, {
		credentials: 'include',
		...options,
		headers,
	});

	// If we get a 401 and this isn't already a refresh request, try to refresh token
	if (res.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
		console.log('🔄 Token expired, attempting automatic refresh...');
		try {
			const refreshRes = await fetch(`${getApiBase()}/api/auth/refresh`, {
				method: 'POST',
				credentials: 'include',
				headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
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
				
				return { ok: retryRes.ok, status: retryRes.status, data: retryData };
			} else {
				console.log('❌ Token refresh failed, user needs to login again');
			}
		} catch (e) {
			console.log('💥 Error during token refresh:', e);
		}
	}

	let data: any = null;
	try {
		data = await res.json();
	} catch (_e) {
		data = null;
	}

	return { ok: res.ok, status: res.status, data };
}

export async function umUpdateProfile(profile: UpdateProfileBody, csrfToken?: string | null): Promise<ApiResult<{ success: boolean }>> {
	return fetchUserMgmtJson<{ success: boolean }>('/me/profile', {
		method: 'PATCH',
		body: JSON.stringify({ profile })
	}, csrfToken);
}

export type CsrfResponse = { csrfToken: string };
export async function getCsrfToken(): Promise<string | null> {
	const result = await fetchJson<CsrfResponse>('/api/csrf-token');
	if (result.ok && (result.data as CsrfResponse)?.csrfToken) {
		return (result.data as CsrfResponse).csrfToken;
	}
	return null;
}

export type RegisterBody = { email: string; password: string };
export async function register(body: RegisterBody, csrfToken?: string | null) {
	return fetchJson('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(body),
	}, csrfToken);
}

export type LoginBody = { email: string; password: string };
export type LoginResponse = {
	requires2FA?: boolean;
	user?: { id: number; email: string };
	expiresIn?: number;
	tokenType?: string;
};
export async function login(body: LoginBody, csrfToken?: string | null) {
	return fetchJson<LoginResponse>('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(body),
	}, csrfToken);
}

export type Login2FABody = { token: string };
export type Login2FAResponse = LoginResponse;
export async function login2fa(body: Login2FABody, csrfToken?: string | null) {
	return fetchJson<Login2FAResponse>('/api/auth/login/2fa', {
		method: 'POST',
		body: JSON.stringify(body),
	}, csrfToken);
}

export async function logout(csrfToken?: string | null) {
	// No body: avoids sending Content-Type
	return fetchJson('/api/auth/logout', { method: 'POST' }, csrfToken);
}

export async function refresh(csrfToken?: string | null) {
	return fetchJson('/api/auth/refresh', { method: 'POST' }, csrfToken);
}

export type MeResponse = { userId: number; email: string };
export async function me(csrfToken?: string | null) {
	return fetchJson<MeResponse>('/api/auth/me', {}, csrfToken);
}

export type TwoFASetupStartResponse = { qrCode: string };
export async function twofaSetupStart(csrfToken?: string | null) {
	return fetchJson<TwoFASetupStartResponse>('/api/auth/2fa/setup-start', { method: 'POST' }, csrfToken);
}

export type TwoFASetupVerifyBody = { token: string };
export type TwoFASetupVerifyResponse = { message: string };
export async function twofaSetupVerify(body: TwoFASetupVerifyBody, csrfToken?: string | null) {
	return fetchJson<TwoFASetupVerifyResponse>('/api/auth/2fa/setup-verify', { method: 'POST', body: JSON.stringify(body) }, csrfToken);
}

export type TwoFADisableBody = { password: string };
export type TwoFADisableResponse = { message: string };
export async function twofaDisable(body: TwoFADisableBody, csrfToken?: string | null) {
	return fetchJson<TwoFADisableResponse>('/api/auth/2fa/disable', { method: 'rIdPOST', body: JSON.stringify(body) }, csrfToken);
}

export type TwoFAStatusResponse = { enabled: boolean };
export async function twofaStatus(csrfToken?: string | null) {
    return fetchJson<TwoFAStatusResponse>('/api/auth/2fa/status', {}, csrfToken);
}

export function isProfileComplete(profile: UMUser): boolean {
	// Check if username is NOT the default format (user_123)
	const hasCustomUsername = profile.username && !profile.username.match(/^user_\d+$/);

	// Check if first_name and last_name are filled
	const hasFirstName = !!profile.first_name?.trim();
	const hasLastName = !!profile.last_name?.trim();
	
	return !!(hasCustomUsername && hasFirstName && hasLastName);
}

// User-management endpoints (usr-manag microservice)
// - Dev: talk directly to :4000
// - Prod: go through nginx /api/users/*
const getUserMgmtBase = () => {
	if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
		return `${process.env.NEXT_PUBLIC_BASE_URL}/api/users`;
	}
	if (typeof window !== 'undefined') {
		return `http://${window.location.hostname}:4000`;
	}
	return process.env.NEXT_PUBLIC_USER_MGMT_API_BASE ?? 'http://localhost:4000';
};

async function fetchUserMgmtJson<T = any>(path: string, options: RequestInit = {}, csrfToken?: string | null): Promise<ApiResult<T>> {
    const url = `${getUserMgmtBase()}${path}`;
    const headers: HeadersInit = new Headers(options.headers);
    
    // Add CSRF token if available
    if (csrfToken) {
        (headers as Headers).set('X-CSRF-Token', csrfToken);
    }
    
    // Set content type for requests with body
    if (options.body && !isJsonContentType(headers)) {
        (headers as Headers).set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
        credentials: 'include', // Important: include cookies for JWT
        ...options,
        headers,
    });

    // If we get a 401, try to refresh token
    if (res.status === 401) {
        console.log('🔄 User mgmt token expired, attempting automatic refresh...');
        try {
            const refreshRes = await fetch(`${getApiBase()}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
            });
            
            if (refreshRes.ok) {
                console.log('✅ Token refreshed successfully, retrying user mgmt request...');
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
                
                return { ok: retryRes.ok, status: retryRes.status, data: retryData };
            } else {
                console.log('❌ Token refresh failed for user mgmt request');
            }
        } catch (e) {
            console.log('💥 Error during user mgmt token refresh:', e);
        }
    }

    let data: any = null;
    try {
        data = await res.json();
    } catch (_e) {
        data = null;
    }

    return { ok: res.ok, status: res.status, data };
}

export type UMUser = {
    id: number;
    username: string; 
    first_name?: string; 
    last_name?: string; 
    profile_pic?: string; 
    avatar_updated_at?: number;
    is_online: number; 
    created_at: string; 
    updated_at?: string; 
};

export type ProfileCompleteResponse = { complete: boolean };
export async function umProfileComplete(csrfToken?: string | null) {
	return fetchUserMgmtJson<ProfileCompleteResponse>('/me/profile/complete', {}, csrfToken);
}

export async function umListUsers(search?: string, csrfToken?: string | null) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchUserMgmtJson<UMUser[]>(`/users${qs}`, {}, csrfToken);
}

export async function umGetMe(csrfToken?: string | null) {
    return fetchUserMgmtJson<UMUser>('/me', {}, csrfToken);
}

export async function umGetUser(id: string | number, csrfToken?: string | null) {
    return fetchUserMgmtJson<UMUser>(`/users/${id}`, {}, csrfToken);
}

export async function umUpdateStatus(isOnline: boolean, csrfToken?: string | null) {
    return fetchUserMgmtJson<{ success: boolean; is_online: boolean }>('/me/status', {
        method: 'PATCH',
        body: JSON.stringify({ is_online: isOnline })
    }, csrfToken);
}

export async function umDeleteMe(csrfToken?: string | null) {
    return fetchUserMgmtJson<{ success: boolean; message: string }>('/me', { method: 'DELETE' }, csrfToken);
}

export async function umAddFriend(targetId: string | number, csrfToken?: string | null) {
    return fetchUserMgmtJson<{ success: boolean; message: string; requestId: string }>(`/users/${targetId}/friend`, {
        method: 'POST'
    }, csrfToken);
}

export async function umBlockUser(targetId: string | number, csrfToken?: string | null) {
	return fetchUserMgmtJson<{ success: boolean; message: string }>(`/users/${targetId}/block`, {
		method: 'POST'
	}, csrfToken);
}

/**
 * Decode JWT token and extract payload (without verification)
 * Note: This only decodes the token, it doesn't verify the signature
 */
export function decodeJWT(token: string): { sub?: number; email?: string; [key: string]: any } | null {
	try {
		// JWT format: header.payload.signature
		
		console.log('Decoding JWT:', token); // Debug
		
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}
		
		// Decode the payload (second part)
		// Replace URL-safe base64 characters and add padding if needed
		const payload = parts[1];
		const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
		
		const decoded = JSON.parse(atob(padded));
		return decoded;
	} catch (error) {
		console.error('Failed to decode JWT:', error);
		return null;
	}
}

/**
 * Get email from JWT access token stored in cookies
 */
export function getEmailFromToken(): string | null {
	if (typeof document === 'undefined') {
		return null;
	}
	
	// Get accessToken from cookies
	const cookies = document.cookie.split(';');
	
	console.log('Cookies:', cookies); // Debug
	const accessTokenCookie = cookies.find(cookie => 
		cookie.trim().startsWith('accessToken=')
	);
	
	if (!accessTokenCookie) {
		return null;
	}
	
	const token = accessTokenCookie.split('=')[1]?.trim();
	if (!token) {
		return null;
	}
	
	const decoded = decodeJWT(token);
	return decoded?.email || null;
}
