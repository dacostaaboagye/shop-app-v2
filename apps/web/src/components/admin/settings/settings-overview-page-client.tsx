"use client";

import {
  Building2,
  FileText,
  Landmark,
  Palette,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <CardTitle>{item.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
