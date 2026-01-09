import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const url = req.nextUrl.clone();
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

  // If no accessToken but we have a refreshToken, allow the request through
  // The client-side code will handle the token refresh
  if (!accessToken) {
    if (refreshToken) {
      // Allow request through - client will handle refresh
      return NextResponse.next();
    }
    // No tokens at all, redirect to login
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    // console.log("* MIDDLEWARE ===> valid access token", payload);
    return NextResponse.next();
  } catch (err) {
    // Access token invalid, but if we have refreshToken, allow through
    if (refreshToken) {
      // Allow request through - client will handle refresh
      return NextResponse.next();
    }
    // No valid tokens, redirect to login
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/settings", "/chat"],
};
