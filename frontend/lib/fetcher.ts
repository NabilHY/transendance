import { getApiUrls } from './api-config';

export async function fetchCurrentUser() {
  // console.log("url --> ", process.env.NEXT_PUBLIC_USR_MANAG_URL);
  try {
    // Prefer explicit NEXT_PUBLIC_USR_MANAG_URL when provided; otherwise fall back to dynamic hostname+port.
    const base = process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag;

    const res = await fetch(`${base}/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("User not authenticated");
        return null;
      }
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch current user:", err);
    return null;
  }
}

export async function getUserData(id: string) {

  

}
