import type { NavRegistryEntry } from "./portal-shell-config.types";
import { ADMIN_ACCESS_NAV_REGISTRY } from "./portal-shell-registry.primary.sections.admin-access";
import { COMMERCE_CATALOG_SUPPLY_NAV_REGISTRY } from "./portal-shell-registry.primary.sections.commerce-catalog-supply";

export const PRIMARY_SECTION_NAV_REGISTRY: readonly NavRegistryEntry[] = [
  ...ADMIN_ACCESS_NAV_REGISTRY,
  ...COMMERCE_CATALOG_SUPPLY_NAV_REGISTRY,
];
