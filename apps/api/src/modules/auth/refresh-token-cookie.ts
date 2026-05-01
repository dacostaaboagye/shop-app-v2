import type { FastifyReply } from "fastify";
import { getApiEnv } from "../../env.js";

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
