import type { LucideIcon } from "lucide-react";
import type { Route } from "next";

type PathMatchMode = "exact" | "descendants";

export type PortalPathMatcher = {
  mode?: PathMatchMode;
  path: string;
};

export type PortalNavItem = {
  activeMatchers?: readonly PortalPathMatcher[];
  description: string;
  href: Route;
  icon: LucideIcon;
  label: string;
  locationSelectorPermission?: string | null;
  requiredPermission?: string;
};

export type PortalNavSection = {
  items: PortalNavItem[];
  title: string;
};

export type ShellMeta = {
  emptyNotificationCopy: string;
  heading: string;
};

export type NavRegistryEntry = {
  activeMatchers?: readonly PortalPathMatcher[];
  description: string;
  href: Route;
  icon: LucideIcon;
  label: string;
  locationSelectorPermission?: string | null;
  requiredPermission: string;
  section: string;
  sidebar?: false;
};
