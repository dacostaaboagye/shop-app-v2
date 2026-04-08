import type { FastifyReply } from "fastify";
import { getApiEnv } from "../../env.js";

export const refreshTokenCookieName = "shop_refresh_token";

const refreshTokenCookiePath = "/api/auth";

export function setRefreshTokenCookie(
  reply: FastifyReply,
  refreshToken: string,
  refreshTokenExpiresAt: string,
) {
  reply.setCookie(refreshTokenCookieName, refreshToken, {
    expires: new Date(refreshTokenExpiresAt),
    httpOnly: true,
    path: refreshTokenCookiePath,
    sameSite: "strict",
    secure: resolveSecureCookies(),
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply) {
  reply.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    path: refreshTokenCookiePath,
    sameSite: "strict",
    secure: resolveSecureCookies(),
  });
}

function resolveSecureCookies(): boolean {
  return getApiEnv().authCookieSecure;
}
