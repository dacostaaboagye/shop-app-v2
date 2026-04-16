import type { AuthUser, PortalKey } from "@shop/contracts";
import { Building2, Package, ShieldCheck, Truck, Users } from "lucide-react";
import type { Route } from "next";
import type { ComponentType } from "react";

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
};

const PORTAL_KEY_SET = new Set<string>(Object.keys(PORTALS));

export function isPortalKey(value: unknown): value is PortalKey {
  return typeof value === "string" && PORTAL_KEY_SET.has(value);
}

export function getPortalHref(portal: PortalKey): Route {
  return PORTALS[portal].href;
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
