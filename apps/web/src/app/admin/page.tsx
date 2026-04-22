import {
  ArrowRight,
  type LucideIcon,
  MapPin,
  Package,
  UserCheck,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toRoute } from "@/lib/routes";

const quickLinks: {
  description: string;
  href: Route;
  Icon: LucideIcon;
  title: string;
}[] = [
  {
    title: "User management",
    description: "View and manage all users, roles, and location assignments.",
    href: toRoute("/admin/users"),
    Icon: Users,
  },
  {
    title: "Locations",
    description: "Create and manage stores and warehouses.",
    href: toRoute("/admin/locations"),
    Icon: MapPin,
  },
  {
    title: "Products",
    description: "Manage the product catalogue, variants, and suppliers.",
    href: toRoute("/admin/products"),
    Icon: Package,
  },
  {
    title: "Access control",
    description:
      "Manage roles, inspect permissions, and review access changes.",
    href: toRoute("/admin/access"),
    Icon: UserCheck,
  },
];

export default function AdminPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Admin portal"
        title="Operational control redefined"
        description="A unified namespace for managing user access, global locations, and the product catalogue with high-precision permission filtering."
        badges={["Route-aware nav", "Permission-gated", "Unified shell"]}
        aside={
          <InsightCard
            eyebrow="System status"
            title="Foundation ready"
            description="Administration logic is now fully integrated into the portal namespace with route-level guards."
          >
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <span className="text-xs font-bold text-muted-foreground/80">API Latency</span>
                <span className="text-xs font-black text-emerald-500">24ms</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
                <span className="text-xs font-bold text-muted-foreground/80">Active Sessions</span>
                <span className="text-xs font-black text-foreground">142</span>
              </div>
            </div>
          </InsightCard>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map(({ title, description, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                <Icon className="size-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading text-lg font-bold tracking-tight text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground/70">
                  {description}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
              View portal
              <ArrowRight className="size-3.5" />
            </div>

            {/* Subtle interactive accent */}
            <div className="absolute -right-4 -top-4 size-16 rounded-full bg-primary/5 transition-all group-hover:scale-150" />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
