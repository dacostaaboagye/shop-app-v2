"use client";

import {
  Building2,
  FileText,
  Landmark,
  Palette,
  ShieldCheck,
} from "lucide-react";
import {
  PageHeader,
  PageShell,
  MenuCard,
} from "@/components/system/page-shell";
import { toRoute } from "@/lib/routes";

const SETTINGS_LINKS = [
  {
    description: "Logo media, brand name, logo mark, and brand colors.",
    href: toRoute("/admin/settings/brand"),
    icon: Palette,
    label: "Brand",
  },
  {
    description: "Legal identity, registration, tax, address, and contact.",
    href: toRoute("/admin/settings/business"),
    icon: Building2,
    label: "Business profile",
  },
  {
    description: "Currency, rounding, and multi-currency readiness.",
    href: toRoute("/admin/settings/money"),
    icon: Landmark,
    label: "Money",
  },
  {
    description: "Document paper, prefixes, locale, timezone, and footer.",
    href: toRoute("/admin/settings/documents"),
    icon: FileText,
    label: "Documents",
  },
  {
    description: "Fields managers may override for their locations.",
    href: toRoute("/admin/settings/location-overrides"),
    icon: ShieldCheck,
    label: "Location overrides",
  },
] as const;

export function SettingsOverviewPageClient() {
  return (
    <PageShell>
      <PageHeader
        description="Manage platform configuration by area instead of one growing settings form."
        title="Settings"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_LINKS.map((item) => (
          <MenuCard
            key={item.href}
            description={item.description}
            href={item.href}
            icon={item.icon}
            title={item.label}
          />
        ))}
      </div>
    </PageShell>
  );
}
