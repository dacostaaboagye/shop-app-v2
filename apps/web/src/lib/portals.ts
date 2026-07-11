import type { AuthPermissionSet, AuthUser, PortalKey } from "@shop/contracts";
import {
  Building2,
  Package,
  ReceiptText,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import type { Route } from "next";
import type { ComponentType } from "react";
import { toRoute } from "@/lib/routes";

export type { PortalKey };

type PortalMeta = {
  key: PortalKey;
  label: string;
  href: Route;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

export const PORTALS: Record<PortalKey, PortalMeta> = {
  admin: {
    key: "admin",
    label: "Admin",
    href: "/admin" as Route,
    description: "Manage users, locations, permissions, and system settings.",
    Icon: ShieldCheck,
  },
  manager: {
    key: "manager",
    label: "Manager",
    href: "/manager" as Route,
    description: "Oversee your location — stock health, staff, and operations.",
    Icon: Building2,
  },
  worker: {
    key: "worker",
    label: "Worker",
    href: "/worker" as Route,
    description: "View your assigned stock and handle day-to-day tasks.",
    Icon: Users,
  },
  supplier: {
    key: "supplier",
    label: "Supplier",
    href: "/supplier" as Route,
    description:
      "Manage your products, pricing, and purchase order fulfilment.",
    Icon: Package,
  },
  agent: {
    key: "agent",
    label: "Agent",
    href: "/agent" as Route,
    description: "View and complete your delivery assignments for today.",
    Icon: Truck,
  },
  customer: {
    key: "customer",
    label: "Customer",
    href: "/customer" as Route,
    description: "View invoices, order history, and account updates.",
    Icon: ReceiptText,
  },
};

const PORTAL_KEY_SET = new Set<string>(Object.keys(PORTALS));

export function isPortalKey(value: unknown): value is PortalKey {
  return typeof value === "string" && PORTAL_KEY_SET.has(value);
}

export function getPortalHref(portal: PortalKey): Route {
  return PORTALS[portal].href;
}

export function getPortalLandingHref(
  user: Pick<
    AuthUser,
    "availablePortals" | "permissionSet" | "preferredPortal"
  >,
): Route {
  const portal = getPrimaryPortal(user);

  if (!portal) {
    return toRoute("/");
  }

  const locationSlug = resolvePortalLandingLocationSlug(
    portal,
    user.permissionSet,
  );

  if (!locationSlug) {
    return getPortalHref(portal);
  }

  const searchParams = new URLSearchParams({ location: locationSlug });
  return toRoute(`${getPortalHref(portal)}?${searchParams.toString()}`);
}

export function getAvailablePortals(
  user: Pick<AuthUser, "availablePortals"> | null | undefined,
): PortalKey[] {
  const portals = user?.availablePortals ?? [];

  return portals.filter(isPortalKey);
}

export function getPreferredPortal(
  user: Pick<AuthUser, "availablePortals" | "preferredPortal">,
): PortalKey | null {
  return isPortalKey(user.preferredPortal) &&
    getAvailablePortals(user).includes(user.preferredPortal)
    ? user.preferredPortal
    : null;
}

export function getPortalSelectionState(
  user: Pick<AuthUser, "availablePortals" | "preferredPortal">,
): {
  availablePortals: PortalKey[];
  preferredPortal: PortalKey | null;
} {
  const availablePortals = getAvailablePortals(user);

  return {
    availablePortals,
    preferredPortal: getPreferredPortal(user),
  };
}

export function getPrimaryPortal(
  user: Pick<AuthUser, "availablePortals" | "preferredPortal">,
): PortalKey | null {
  const { availablePortals, preferredPortal } = getPortalSelectionState(user);

  if (preferredPortal) {
    return preferredPortal;
  }

  return availablePortals[0] ?? null;
}

function resolvePortalLandingLocationSlug(
  portal: PortalKey,
  permissionSet: AuthPermissionSet | undefined,
): string | null {
  const locationScopes = permissionSet?.locationScopes ?? [];
  const permission = getPortalLandingLocationPermission(portal);

  if (!permission) {
    return null;
  }

  return (
    locationScopes.find((scope) => scope.permissions.includes(permission))
      ?.locationSlug ?? null
  );
}

function getPortalLandingLocationPermission(portal: PortalKey): string | null {
  switch (portal) {
    case "manager":
      return "stock.view";
    case "worker":
      return "stock.assignments.own.view";
    default:
      return null;
  }
}
