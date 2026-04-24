type PermissionLike = {
  description: string;
  key: string;
};

type PermissionGroup<TPermission extends PermissionLike> = {
  items: TPermission[];
  key: string;
  label: string;
};

const AREA_LABELS: Record<string, string> = {
  access: "Access",
  admin: "Admin",
  agent: "Agent",
  catalog: "Catalog",
  deliveries: "Deliveries",
  inventory: "Inventory",
  locations: "Locations",
  manager: "Manager",
  orders: "Orders",
  staff: "Staff",
  stock: "Stock",
  supplier: "Supplier",
  suppliers: "Suppliers",
  transfers: "Transfers",
  users: "Users",
  worker: "Worker",
};

const SUBAREA_LABELS: Record<string, string> = {
  assignments: "Assignments",
  audit: "Audit",
  catalog: "Catalog",
  dashboard: "Dashboard",
  handovers: "Handovers",
  permissions: "Permissions",
  roles: "Roles",
  routes: "Routes",
  stock: "Stock",
  transfers: "Transfers",
  users: "Users",
};

export function buildPermissionGroups<TPermission extends PermissionLike>(
  permissions: readonly TPermission[],
): PermissionGroup<TPermission>[] {
  const groups = new Map<string, PermissionGroup<TPermission>>();

  for (const permission of [...permissions].sort((left, right) =>
    left.key.localeCompare(right.key),
  )) {
    const groupKey = getPermissionGroupKey(permission.key);
    const existingGroup = groups.get(groupKey);

    if (existingGroup) {
      existingGroup.items.push(permission);
      continue;
    }

    groups.set(groupKey, {
      items: [permission],
      key: groupKey,
      label: getPermissionSurfaceLabel(permission.key),
    });
  }

  return Array.from(groups.values());
}

export function getPermissionActionLabel(permissionKey: string) {
  return humanizeSegment(getPermissionSegments(permissionKey).at(-1) ?? "view");
}

export function getPermissionGroupKey(permissionKey: string) {
  const segments = getPermissionSegments(permissionKey);

  if (segments.length >= 3 && isNestedPermissionArea(segments[0] ?? "")) {
    return `${segments[0]}.${segments[1]}`;
  }

  return segments[0] ?? permissionKey;
}

export function getPermissionSurfaceLabel(permissionKey: string) {
  const segments = getPermissionSegments(permissionKey);
  const area =
    AREA_LABELS[segments[0] ?? ""] ?? humanizeSegment(segments[0] ?? "");
  const subareaKey =
    segments.length >= 3 && isNestedPermissionArea(segments[0] ?? "")
      ? segments[1]
      : null;

  if (!subareaKey) {
    return area;
  }

  const subarea = SUBAREA_LABELS[subareaKey] ?? humanizeSegment(subareaKey);
  return `${area} / ${subarea}`;
}

export function getPermissionUsageHint(permission: PermissionLike) {
  return `${getPermissionSurfaceLabel(permission.key)} · ${getPermissionActionLabel(permission.key)}`;
}

function getPermissionSegments(permissionKey: string) {
  return permissionKey.split(".").filter(Boolean);
}

function humanizeSegment(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isNestedPermissionArea(area: string) {
  return ["access", "admin", "agent", "manager", "supplier", "worker"].includes(
    area,
  );
}
