/**
 * User data type with avatar information
 */
export type UserWithAvatar = {
  id: number;
  profile_pic?: string | null;
  avatar_updated_at?: number | null;
  username?: string;
  first_name?: string;
  last_name?: string;
};

/**
 * Cache for presigned URLs keyed by user ID and avatar_updated_at timestamp
 * This ensures cache busting when avatar is updated
 */
const avatarUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Cache duration: 50 minutes (presigned URLs are valid for 1 hour)
 */
const CACHE_DURATION_MS = 50 * 60 * 1000;

/**
 * Default placeholder avatar (can be replaced with your own default image)
 */
const DEFAULT_AVATAR = '../public/avatar.png'; // You can customize this path

/**
 * Generate a cache key from user ID and avatar timestamp
 */
function getCacheKey(userId: number, avatarUpdatedAt: number | null | undefined): string {
  return `${userId}:${avatarUpdatedAt || 0}`;
}

/**
 * Get presigned avatar URL from backend
 * Uses Next.js proxy for same-origin requests (cookies, no CORS)
 */
async function fetchPresignedUrl(userId: number, isCurrentUser: boolean = false): Promise<string | null> {
  try {
    // Use Next.js proxy for same-origin requests (automatic cookies, no CORS)
    const endpoint = isCurrentUser ? '/media/avatar/me' : `/media/avatar/users/${userId}`;
    
    console.log('Fetching presigned URL from:', endpoint);
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    console.log('Avatar URL response status:', response.status);
    if (!response.ok) {
      if (response.status === 404) {
        console.log('User has no avatar (404)');
        return null; // User has no avatar
      }
      const errorText = await response.text();
      console.error('Avatar URL fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch avatar URL: ${response.status}`);
    }

    const data = await response.json();
    console.log('Avatar URL response data:', data);
    return data.url || null;
  } catch (error) {
    console.error('Error fetching presigned avatar URL:', error);
    return null;
  }
}

export async function getAvatarUrl(
  user: UserWithAvatar,
  options: {
    isCurrentUser?: boolean;
    useCache?: boolean;
    fallback?: string | null;
  } = {}
): Promise<string | null> {
  const { isCurrentUser = false, useCache = true, fallback = DEFAULT_AVATAR } = options;

  // If user has no avatar object key, return fallback
  if (!user.profile_pic) {
    return fallback;
  }

  const cacheKey = getCacheKey(user.id, user.avatar_updated_at);

  // Check cache if enabled
  if (useCache) {
    const cached = avatarUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }
  }

  // Fetch presigned URL from backend
  const url = await fetchPresignedUrl(user.id, isCurrentUser);

  if (!url) {
    return fallback;
  }

  // Cache the URL
  if (useCache) {
    avatarUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });
  }

  return url;
}

/**
 * Get avatar URL synchronously (returns cached URL or null)
 * Use this for components that need immediate rendering without async
 * 
 * @param user - User object with id, profile_pic, and avatar_updated_at
 * @param fallback - Fallback URL if no cached avatar available
 * @returns Cached avatar URL or fallback/null
 */

export function getAvatarUrlSync(
  user: UserWithAvatar,
  fallback: string | null = DEFAULT_AVATAR
): string | null {
  if (!user.profile_pic) {
    return fallback;
  }

  const cacheKey = getCacheKey(user.id, user.avatar_updated_at);
  const cached = avatarUrlCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  return fallback;
}

/**
 * Clear avatar cache for a specific user (useful after avatar update)
 */
export function clearAvatarCache(userId: number): void {
  const keysToDelete: string[] = [];
  for (const key of avatarUrlCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => avatarUrlCache.delete(key));
}

/**
 * Clear all avatar cache
 */
export function clearAllAvatarCache(): void {
  avatarUrlCache.clear();
}

/**
 * Generate initials for fallback avatar display
 */
export function getInitials(user: UserWithAvatar): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  if (user.username && user.username.length > 0) {
    // Try to get 2 characters from username for better visual
    if (user.username.length >= 2) {
      return user.username.substring(0, 2).toUpperCase();
    } else {
      return user.username[0].toUpperCase();
    }
  }
  return '?';
}

