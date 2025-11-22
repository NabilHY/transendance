
export async function fetchCurrentUser() {
  // console.log("url --> ", process.env.NEXT_PUBLIC_USR_MANAG_URL);
  try {

    const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/me`, {
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