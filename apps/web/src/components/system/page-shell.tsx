import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PreviewImage } from "./preview-image";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

type HeroPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  badges?: string[];
  actions?: ReactNode;
  aside?: ReactNode;
};

type InsightCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn("page-shell flex flex-col gap-6", className)}>
      {children}
    </main>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  badges,
  actions,
  aside,
}: HeroPanelProps) {
  return (
    <section className="hero-grid">
      <Card className="hero-panel border-none py-0">
        <CardContent className="flex flex-col gap-6 px-6 py-7 sm:px-8 sm:py-9">
          <div className="eyebrow-block">
            <p className="editorial-kicker">{eyebrow}</p>
            <h1 className="max-w-4xl text-5xl leading-none font-medium sm:text-6xl lg:text-7xl">
              {title}
            </h1>
          </div>
          <p className="hero-copy text-base sm:text-lg">{description}</p>
          {badges?.length ? (
            <div className="token-row">
              {badges.map((badge) => (
                <Badge key={badge} variant="secondary">
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
          {actions ? <div className="token-row">{actions}</div> : null}
        </CardContent>
      </Card>
      {aside}
    </section>
  );
}

type PageHeaderProps = {
  action?: ReactNode;
  actions?: ReactNode;
  avatar?: ReactNode;
  backHref?: Route;
  backLabel?: string;
  description?: string;
  eyebrow?: string;
  image?: string | null;
  title: string;
};

export function PageHeader({
  title,
  description,
  action,
  actions,
  avatar,
  backHref,
  backLabel = "Back",
  eyebrow,
  image,
}: PageHeaderProps) {
  const headerActions = actions ?? action;

  return (
    <section className="rounded-lg border border-border/70 bg-card/95 px-4 py-4 shadow-sm sm:px-5">
      {backHref || headerActions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "rounded-full pr-3 text-muted-foreground hover:text-foreground",
                )}
              >
                <ChevronLeft className="size-3.5" />
                {backLabel}
              </Link>
            ) : null}
            {backHref && headerActions ? (
              <div className="hidden h-4 w-px bg-border/70 sm:block" />
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-w-0 items-center gap-4">
        {image ? (
          <PreviewImage
            alt={`${title} image`}
            className="size-14 shrink-0 rounded-xl"
            height={56}
            imageClassName="rounded-xl"
            previewTitle={title}
            src={image}
            width={56}
          />
        ) : avatar ? (
          avatar
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="editorial-kicker mb-1">{eyebrow}</p> : null}
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
    <Card
      className={cn(
        "border-border/75 bg-card/95 shadow-sm",
        href && "transition-colors hover:border-primary/30 hover:bg-accent/25",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
            <Icon className="size-4" />
          </div>
        </div>
        <p className="mt-3 font-sans text-2xl font-bold tabular-nums">
          {value}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link className="block" href={href}>
        {card}
      </Link>
    );
  }

  return card;
}

export function InsightCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: InsightCardProps) {
  return (
    <Card className={cn("surface-card gap-0", className)}>
      <CardHeader className="gap-2">
        <p className="editorial-kicker">{eyebrow}</p>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
