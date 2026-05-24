import type { AuthUser, PortalKey } from "@shop/contracts";
import { toRoute } from "@/lib/routes";

const PORTAL_ROUTE_PREFIXES = [
  "admin",
  "manager",
  "worker",
  "supplier",
  "agent",
  "customer",
] as const;

export function getPortalKeyFromPathname(pathname: string): PortalKey | null {
  const segment = pathname.split("/").filter(Boolean)[0];

  return PORTAL_ROUTE_PREFIXES.includes(segment as PortalKey)
    ? (segment as PortalKey)
    : null;
}

export function getPortalAccountHref(input: {
  pathname: string;
  user: Pick<AuthUser, "availablePortals" | "preferredPortal"> | null;
}) {
  const portalKey =
    getPortalKeyFromPathname(input.pathname) ??
    input.user?.preferredPortal ??
    input.user?.availablePortals[0];

  return toRoute(`/${portalKey ?? "admin"}/account`);
}
