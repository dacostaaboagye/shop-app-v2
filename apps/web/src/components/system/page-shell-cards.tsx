import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  description?: string;
  href?: Route;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
};

export function StatCard({
  description,
  href,
  icon: Icon,
  label,
  value,
}: StatCardProps) {
  const card = (
    <div
      className={cn(
        "group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-border/80 hover:shadow-md",
        href && "cursor-pointer active:scale-[0.98]",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="type-kicker text-muted-foreground">{label}</p>
          <div className="min-w-0 max-w-full overflow-hidden">
            <h3 className="type-stat-value overflow-wrap-anywhere text-foreground">
              {value}
            </h3>
          </div>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      {description && (
        <p className="type-support mt-5 text-xs overflow-wrap-anywhere">
          {description}
        </p>
      )}
    </div>
  );

  return href ? (
    <Link className="block" href={href}>
      {card}
    </Link>
  ) : (
    card
  );
}

export function InsightCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card p-10 shadow-sm",
        className,
      )}
    >
      <div className="mb-10 min-w-0 flex flex-col gap-2">
        <p className="type-kicker text-[var(--kicker-foreground)]">{eyebrow}</p>
        <h3 className="type-section-title overflow-wrap-anywhere text-foreground">
          {title}
        </h3>
        {description && <p className="type-page-description">{description}</p>}
      </div>
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
}

export function MenuCard({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: Route;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full border border-border/50 bg-card p-8 shadow-sm transition-all hover:bg-muted/50">
        <CardHeader className="p-0 mb-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="size-5" />
            </div>
            <CardTitle className="type-section-title overflow-wrap-anywhere text-xl text-foreground">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="type-support">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
