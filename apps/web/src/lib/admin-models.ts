import type { PortalKey } from "@shop/contracts";

export const STAFF_ROLE_KEYS = [
  "admin",
  "manager",
  "worker",
  "supplier",
  "agent",
] as const;

export const ALL_ROLE_KEYS = ["basic_user", ...STAFF_ROLE_KEYS] as const;

export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];
export type RoleKey = (typeof ALL_ROLE_KEYS)[number];
export type ManagedUserStatus = "active" | "deactivated" | "suspended";
export type ManagedLocationStatus = "active" | "inactive";
export type ManagedLocationType = "store" | "warehouse";

const BADGE_CLASS_NAMES = {
  emphasis: "bg-primary/10 text-primary border-0",
  muted: "bg-muted/40 text-muted-foreground border-0",
  secondary: "bg-secondary text-secondary-foreground border-0",
  danger: "bg-destructive/10 text-destructive border-0",
} as const;

export type ManagedUserRecord = {
  assignedLocationIds: string[];
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  notes: string;
  preferredPortal: PortalKey | null;
  requiresPasswordChange: boolean;
  roles: RoleKey[];
  status: ManagedUserStatus;
};

export type ManagedLocationRecord = {
  createdAt: string;
  id: string;
  managerName: string | null;
  managerUserId: string | null;
  name: string;
  pendingTransfers: number;
  referenceNumber: string;
  slug: string;
  staffCount: number;
  status: ManagedLocationStatus;
  type: ManagedLocationType;
  zoneNames: string[];
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  agent: "Agent",
  admin: "Admin",
  basic_user: "Basic user",
  manager: "Manager",
  supplier: "Supplier",
  worker: "Worker",
};

export const ROLE_PERMISSION_GRANTS: Record<RoleKey, readonly string[]> = {
  agent: ["agent.dashboard.view"],
  admin: [
    "admin.dashboard.view",
    "users.view",
    "locations.view",
    "catalog.view",
    "inventory.read",
  ],
  basic_user: [],
  manager: ["manager.dashboard.view", "inventory.read"],
  supplier: ["supplier.dashboard.view"],
  worker: ["worker.dashboard.view"],
};

export const ROLE_BADGE_CLASSES: Record<RoleKey, string> = {
  admin: BADGE_CLASS_NAMES.emphasis,
  agent: BADGE_CLASS_NAMES.secondary,
  basic_user: BADGE_CLASS_NAMES.muted,
  manager: BADGE_CLASS_NAMES.emphasis,
  supplier: BADGE_CLASS_NAMES.secondary,
  worker: BADGE_CLASS_NAMES.muted,
};

export const PASSWORD_RESET_BADGE_CLASS_NAME = BADGE_CLASS_NAMES.secondary;

export const ROLE_SCOPE_BADGE_CLASSES = {
  custom: BADGE_CLASS_NAMES.emphasis,
  system: BADGE_CLASS_NAMES.secondary,
  viaRole: BADGE_CLASS_NAMES.secondary,
} as const;

export const OVERRIDE_BADGE_CLASS_NAMES = {
  allow: BADGE_CLASS_NAMES.emphasis,
  deny: BADGE_CLASS_NAMES.danger,
  summary: BADGE_CLASS_NAMES.secondary,
} as const;

export const USER_STATUS_META: Record<
  ManagedUserStatus,
  { className: string; label: string }
> = {
  active: {
    className: BADGE_CLASS_NAMES.emphasis,
    label: "Active",
  },
  deactivated: {
    className: BADGE_CLASS_NAMES.muted,
    label: "Deactivated",
  },
  suspended: {
    className: BADGE_CLASS_NAMES.secondary,
    label: "Suspended",
  },
};

export const LOCATION_STATUS_META: Record<
  ManagedLocationStatus,
  { className: string; label: string }
> = {
  active: {
    className: BADGE_CLASS_NAMES.emphasis,
    label: "Active",
  },
  inactive: {
    className: BADGE_CLASS_NAMES.muted,
    label: "Inactive",
  },
};

export const LOCATION_TYPE_META: Record<
  ManagedLocationType,
  { className: string; label: string }
> = {
  store: {
    className: BADGE_CLASS_NAMES.emphasis,
    label: "Store",
  },
  warehouse: {
    className: BADGE_CLASS_NAMES.secondary,
    label: "Warehouse",
  },
};

export type CatalogEntityStatus = "active" | "archived";

export const CATALOG_STATUS_META: Record<
  CatalogEntityStatus,
  { className: string; label: string }
> = {
  active: {
    className: BADGE_CLASS_NAMES.emphasis,
    label: "Active",
  },
  archived: {
    className: BADGE_CLASS_NAMES.muted,
    label: "Archived",
  },
};

export function deriveAvailablePortals(roles: readonly string[]): PortalKey[] {
  return STAFF_ROLE_KEYS.filter((role) => roles.includes(role));
}

export function formatPortalLabel(portal: PortalKey) {
  return ROLE_LABELS[portal];
}

export function normalizePreferredPortal(
  preferredPortal: PortalKey | null,
  roles: readonly string[],
): PortalKey | null {
  if (!preferredPortal) {
    return null;
  }

  return deriveAvailablePortals(roles).includes(preferredPortal)
    ? preferredPortal
    : null;
}

export function derivePermissionKeys(roles: readonly string[]) {
  return [
    ...new Set(
      roles.flatMap((role) =>
        isRoleKey(role) ? ROLE_PERMISSION_GRANTS[role] : [],
      ),
    ),
  ];
}

export function formatAdminDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function createUserId(users: readonly ManagedUserRecord[]) {
  return `user-${String(users.length + 1).padStart(3, "0")}`;
}

export function createLocationId(locations: readonly ManagedLocationRecord[]) {
  return `loc-${String(locations.length + 1).padStart(3, "0")}`;
}

export function createLocationReference(
  locations: readonly ManagedLocationRecord[],
) {
  return `LOC-${String(locations.length + 1).padStart(4, "0")}`;
}

function isRoleKey(role: string): role is RoleKey {
  return ALL_ROLE_KEYS.includes(role as RoleKey);
}
