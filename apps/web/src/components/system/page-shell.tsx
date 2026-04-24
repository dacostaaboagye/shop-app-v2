import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
