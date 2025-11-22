import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const url = req.nextUrl.clone();
  const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

  if (!accessToken) {
    // console.log("* MIDDLEWARE ===> shiiiiit access token not found");
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    // console.log("* MIDDLEWARE ===> valid access token", payload);
    return NextResponse.next();
  } catch (err) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/settings", "/chat"],
};
