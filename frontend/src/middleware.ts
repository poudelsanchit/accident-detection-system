import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isVerified = token?.isVerified;

  // Bypass for Next.js internals & public assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (token && (pathname.startsWith("/auth") || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (token && !isVerified && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/verification", request.url));
  }
  if (token && isVerified && pathname.startsWith("/verification")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}