import type { NavRegistryEntry } from "./portal-shell-config.types";
import { PRIMARY_OVERVIEW_NAV_REGISTRY } from "./portal-shell-registry.primary.overview";
import { PRIMARY_SECTION_NAV_REGISTRY } from "./portal-shell-registry.primary.sections";

export const PRIMARY_NAV_REGISTRY: readonly NavRegistryEntry[] = [
  ...PRIMARY_OVERVIEW_NAV_REGISTRY,
  ...PRIMARY_SECTION_NAV_REGISTRY,
];
