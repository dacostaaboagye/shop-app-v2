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
        "group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-white p-8 shadow-sm transition-all hover:border-border/80 hover:shadow-md",
        href && "cursor-pointer active:scale-[0.98]",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            {label}
          </p>
          <h3 className="font-heading text-4xl font-bold tracking-tight tabular-nums text-foreground capitalize">
            {value}
          </h3>
        </div>
        <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="size-6" />
        </div>
      </div>
      {description && (
        <p className="mt-6 text-xs font-bold text-muted-foreground/80">
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
        "overflow-hidden rounded-xl border border-border/50 bg-white p-10 shadow-sm",
        className,
      )}
    >
      <div className="mb-10 flex flex-col gap-2">
        <p className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          {eyebrow}
        </p>
        <h3 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-base font-medium text-muted-foreground/80">
            {description}
          </p>
        )}
      </div>
      <div className="relative z-10">{children}</div>
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
      <Card className="h-full border border-border/50 bg-white p-8 shadow-sm transition-all hover:bg-muted/50">
        <CardHeader className="p-0 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="size-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-sm font-medium leading-relaxed text-muted-foreground/80">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
