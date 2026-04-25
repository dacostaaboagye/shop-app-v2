"use client";

import { FileText, Mail, Palette, Settings2 } from "lucide-react";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { SettingsLinkCard } from "./settings-overview-support";

const SETTINGS_LINKS = [
  {
    description: "Logo media, brand name, logo mark, and brand colors.",
    href: "/admin/settings/brand",
    label: "Brand",
    meta: "Identity and media",
  },
  {
    description: "Legal identity, registration, tax, address, and contact.",
    href: "/admin/settings/business",
    label: "Business profile",
    meta: "Document-facing business details",
  },
  {
    description: "Currency, rounding, and multi-currency readiness.",
    href: "/admin/settings/money",
    label: "Money",
    meta: "Commercial defaults",
  },
  {
    description: "Document paper, prefixes, locale, timezone, and footer.",
    href: "/admin/settings/documents",
    label: "Documents",
    meta: "References and output defaults",
  },
  {
    description: "Configure transactional email templates and preview output.",
    href: "/admin/settings/messaging/templates",
    label: "Email templates",
    meta: "Template content and previews",
  },
  {
    description: "Review delivery diagnostics and send branded test emails.",
    href: "/admin/settings/messaging/operations",
    label: "Email operations",
    meta: "Delivery diagnostics",
  },
  {
    description: "Fields managers may override for their locations.",
    href: "/admin/settings/location-overrides",
    label: "Location overrides",
    meta: "Delegated control boundaries",
  },
] as const;

export function SettingsOverviewPageClient() {
  return (
    <PageShell>
      <PageHeader
        description="Manage platform configuration by area so identity, money, documents, and messaging stay clear and auditable."
        title="Settings"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Independent settings workspaces currently available."
          icon={Settings2}
          label="Configuration areas"
          value={SETTINGS_LINKS.length}
        />
        <StatCard
          description="Identity-facing areas that affect customer-facing output."
          icon={Palette}
          label="Brand and profile"
          value={2}
        />
        <StatCard
          description="Commercial and document defaults that shape issued records."
          icon={FileText}
          label="Operational defaults"
          value={2}
        />
        <StatCard
          description="Messaging and delegation areas under central control."
          icon={Mail}
          label="Messaging and policy"
          value={3}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_LINKS.map((item) => (
          <SettingsLinkCard
            key={item.href}
            description={item.description}
            href={item.href}
            label={item.label}
            meta={item.meta}
          />
        ))}
      </div>
    </PageShell>
  );
}
