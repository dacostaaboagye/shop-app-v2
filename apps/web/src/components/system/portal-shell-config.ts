import type { PermissionAbility } from "@/lib/authorization/permission-ability";
import { canUsePermission } from "@/lib/authorization/permission-ability";
import { PORTALS } from "@/lib/portals";
import type {
  PortalNavItem,
  PortalNavSection,
  PortalPathMatcher,
  ShellMeta,
} from "./portal-shell-config.types";
import { NAV_REGISTRY, SHELL_META } from "./portal-shell-registry";

export type {
  PortalNavItem,
  PortalNavSection,
  PortalPathMatcher,
} from "./portal-shell-config.types";

export function getShellConfig(): ShellMeta {
  return SHELL_META;
}

export function getVisibleNavSections(
  ability: PermissionAbility,
): PortalNavSection[] {
  const sectionMap = new Map<string, PortalNavItem[]>();

  for (const entry of NAV_REGISTRY) {
    if (entry.sidebar === false) continue;
    if (!canAccessPortalItem(entry, ability)) continue;

    const item: PortalNavItem = {
      ...(entry.activeMatchers ? { activeMatchers: entry.activeMatchers } : {}),
      description: entry.description,
      href: entry.href,
      icon: entry.icon,
      label: entry.label,
      requiredPermission: entry.requiredPermission,
    };

    const items = sectionMap.get(entry.section) ?? [];

    items.push(item);
    sectionMap.set(entry.section, items);
  }

  return [...sectionMap.entries()].map(([title, items]) => ({ title, items }));
}

export function getRouteItem(pathname: string): PortalNavItem | undefined {
  let activeItem: PortalNavItem | undefined;
  let activeScore = -1;

  for (const entry of NAV_REGISTRY) {
    const item: PortalNavItem = {
      ...(entry.activeMatchers ? { activeMatchers: entry.activeMatchers } : {}),
      description: entry.description,
      href: entry.href,
      icon: entry.icon,
      label: entry.label,
      requiredPermission: entry.requiredPermission,
    };
    const score = getItemMatchScore(item, pathname);

    if (score > activeScore) {
      activeItem = item;
      activeScore = score;
    }
  }

  return activeItem;
}

export function getActiveItem(pathname: string) {
  return getRouteItem(pathname);
}

export function isPortalItemActive(item: PortalNavItem, pathname: string) {
  return getItemMatchScore(item, pathname) >= 0;
}

export function canAccessPortalItem(
  item: Pick<PortalNavItem, "requiredPermission">,
  ability: Pick<PermissionAbility, "can">,
) {
  return item.requiredPermission
    ? canUsePermission(ability, item.requiredPermission)
    : true;
}

function getItemMatchScore(item: PortalNavItem, pathname: string) {
  return getItemMatchers(item).reduce((bestScore, matcher) => {
    const matches = doesPathMatch(pathname, matcher);

    return matches ? Math.max(bestScore, matcher.path.length) : bestScore;
  }, -1);
}

function getItemMatchers(item: PortalNavItem): readonly PortalPathMatcher[] {
  if (item.activeMatchers?.length) {
    return item.activeMatchers;
  }

  return [{ mode: "descendants", path: item.href }];
}

function doesPathMatch(pathname: string, matcher: PortalPathMatcher) {
  if ((matcher.mode ?? "descendants") === "exact") {
    return pathname === matcher.path;
  }

  return pathname === matcher.path || pathname.startsWith(`${matcher.path}/`);
}

export { PORTALS };
