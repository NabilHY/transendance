/**
 * Shared utility for making fetch requests with automatic token refresh
 * This ensures that when access tokens expire, they are automatically refreshed
 * before retrying the original request.
 */

// Dynamic API base URL for auth backend
const getAuthApiBase = () => {
	if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BASE_URL) {
		return process.env.NEXT_PUBLIC_BASE_URL;
	}
	if (typeof window !== 'undefined') {
		return `http://${window.location.hostname}:8005`;
	}
	return process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8005';
};

/**
 * Fetch with automatic token refresh on 401 errors
 * @param url - The URL to fetch
 * @param options - Fetch options (same as standard fetch)
 * @returns Promise<Response> - The fetch response
 */
export async function fetchWithRefresh(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	// Make the initial request
	let response = await fetch(url, {
		credentials: 'include',
		...options,
		headers: {
			...options.headers,
		},
	});

	// If we get a 401 and this isn't already a refresh request, try to refresh token
	if (
		response.status === 401 &&
		!url.includes('/auth/refresh') &&
		!url.includes('/auth/login')
	) {
		console.log('🔄 Token expired, attempting automatic refresh...');
		try {
			const refreshRes = await fetch(`${getAuthApiBase()}/api/auth/refresh`, {
				method: 'POST',
				credentials: 'include',
			});

			if (refreshRes.ok) {
				console.log('✅ Token refreshed successfully, retrying original request...');
				// Retry the original request with fresh token
				response = await fetch(url, {
					credentials: 'include',
					...options,
					headers: {
						...options.headers,
					},
				});
			} else {
				console.log('❌ Token refresh failed, user needs to login again');
			}
		} catch (e) {
			console.log('💥 Error during token refresh:', e);
		}
	}

	return response;
}

