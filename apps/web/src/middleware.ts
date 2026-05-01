import { type NextRequest, NextResponse } from "next/server";
import {
  buildLoginRedirectFromProtectedPath,
  isProtectedPath,
  SESSION_FLAG_COOKIE,
} from "./lib/auth/middleware-policy";

/**
 * Edge-level auth gate. Redirects unauthenticated visitors away from portal
 * routes before any HTML renders, eliminating the flash-of-protected-content
 * that the React-only `AuthGuard` allows. The session-flag cookie carries no
 * secret material; the actual refresh token stays scoped to /api/auth and
 * permission checks remain server-side at the API boundary.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.has(SESSION_FLAG_COOKIE)) {
    return NextResponse.next();
  }

  const target = buildLoginRedirectFromProtectedPath(
    pathname,
    search,
    request.url,
  );
  return NextResponse.redirect(target);
}

export const config = {
  // Skip Next.js internals, static assets, and API rewrites.
  matcher: ["/((?!api/|_next/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
