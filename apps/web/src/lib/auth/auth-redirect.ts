import type { AuthUser } from "@shop/contracts";
import { getPortalLandingHref } from "@/lib/portals";
import { toRoute } from "@/lib/routes";

const LOGIN_ROUTE = "/login";

export function buildLoginRedirectHref(nextPath: string) {
  const safeNextPath = normalizeSafeNextPath(nextPath);
  if (!safeNextPath) {
    return toRoute(LOGIN_ROUTE);
  }

  return toRoute(`${LOGIN_ROUTE}?next=${encodeURIComponent(safeNextPath)}`);
}

export function resolvePostLoginHref(user: AuthUser, nextPath?: string | null) {
  const safeNextPath = normalizeSafeNextPath(nextPath);
  if (safeNextPath) {
    return toRoute(safeNextPath);
  }

  return getPortalLandingHref(user);
}

export function normalizeSafeNextPath(nextPath?: string | null) {
  if (!nextPath) {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}
