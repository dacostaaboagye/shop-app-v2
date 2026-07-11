import type { FastifyReply } from "fastify";
import { getApiEnv } from "../../env.js";

// CSRF posture (audit M3): the refresh cookie is the only cookie the API
// trusts, and it is only read by /api/auth/* token-lifecycle endpoints. All
// other state-changing endpoints authenticate via Authorization: Bearer,
// which cross-site requests cannot attach. The chain that keeps this safe is
// SameSite=Strict + default-deny CORS (C3 fix) + bearer-only mutations. Any
// new state-changing endpoint that reads auth from a cookie needs its own
// CSRF design first. auth.refresh-cookie.test.ts fails if these attributes
// regress.
export const refreshTokenCookieName = "shop_refresh_token";
export const sessionFlagCookieName = "shop_session_active";

const refreshTokenCookiePath = "/api/auth";

export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  refreshTokenExpiresAt: string,
) {
  const expires = new Date(refreshTokenExpiresAt);
  const secure = resolveSecureCookies();
  reply.setCookie(refreshTokenCookieName, refreshToken, {
    expires,
    httpOnly: true,
    path: refreshTokenCookiePath,
    sameSite: "strict",
    secure,
  });
  // Sentinel cookie at site root so the Next.js middleware can detect an
  // active session at the edge and redirect unauthenticated users away from
  // protected routes before any HTML renders. Carries no secret material; the
  // refresh token itself stays scoped to /api/auth.
  reply.setCookie(sessionFlagCookieName, "1", {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure,
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply) {
  const secure = resolveSecureCookies();
  reply.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    path: refreshTokenCookiePath,
    sameSite: "strict",
    secure,
  });
  reply.clearCookie(sessionFlagCookieName, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure,
  });
}

function resolveSecureCookies(): boolean {
  return getApiEnv().authCookieSecure;
}
