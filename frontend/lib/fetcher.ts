
export async function fetchCurrentUser() {
  // console.log("url --> ", process.env.NEXT_PUBLIC_USR_MANAG_URL);
  try {

    const base =
      process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/users`
        : process.env.NEXT_PUBLIC_USR_MANAG_URL;

    if (!base) {
      throw new Error('User management base URL is not configured');
    }

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