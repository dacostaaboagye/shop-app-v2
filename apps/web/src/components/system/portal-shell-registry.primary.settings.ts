import { Settings } from "lucide-react";
import { toRoute } from "@/lib/routes";
import type { NavRegistryEntry } from "./portal-shell-config.types";

export const PRIMARY_SETTINGS_NAV_REGISTRY: readonly NavRegistryEntry[] = [
  {
    activeMatchers: [{ mode: "exact", path: "/admin/settings" }],
    description: "Configuration overview for platform settings.",
    href: toRoute("/admin/settings"),
    icon: Settings,
    label: "Overview",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/admin/settings/brand" }],
    description: "Configure brand identity, colors, and logo media.",
    href: toRoute("/admin/settings/brand"),
    icon: Settings,
    label: "Brand",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/admin/settings/business" }],
    description: "Configure legal identity and business contact details.",
    href: toRoute("/admin/settings/business"),
    icon: Settings,
    label: "Business",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/admin/settings/money" }],
    description: "Configure currencies, scale, and rounding behavior.",
    href: toRoute("/admin/settings/money"),
    icon: Settings,
    label: "Money",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
  {
    activeMatchers: [
      { mode: "descendants", path: "/admin/settings/documents" },
    ],
    description: "Configure document defaults, prefixes, and footer text.",
    href: toRoute("/admin/settings/documents"),
    icon: Settings,
    label: "Documents",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
  {
    activeMatchers: [
      { mode: "descendants", path: "/admin/settings/location-overrides" },
    ],
    description: "Control which document fields locations may override.",
    href: toRoute("/admin/settings/location-overrides"),
    icon: Settings,
    label: "Location overrides",
    requiredPermission: "settings.documents.view",
    section: "Settings",
  },
];
