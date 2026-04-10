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
        title="System control without leaving the workspace"
        description="The admin shell is now route-aware and permission-filtered. User access, locations, products, and live reservations all sit under one coherent namespace."
        badges={["Portal shell", "Permission-gated nav", "Backend-connected"]}
        aside={
          <InsightCard
            eyebrow="Current state"
            title="Foundation routes are ready"
            description="Operational admin work is moving into dedicated pages with backend filters, pagination, and route-level permission guards."
          >
            <p className="text-sm text-muted-foreground">
              The access-control surfaces can now live beside user and location
              administration without relying on hardcoded role bundles.
            </p>
          </InsightCard>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {quickLinks.map(({ title, description, href, Icon }) => (
          <Card
            key={href}
            className="border border-border bg-card shadow-none transition-colors hover:border-border/80 hover:bg-muted/30"
          >
            <CardHeader className="pb-2">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <CardTitle className="font-sans text-base font-semibold">
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={href}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                Open
                <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
