import { ChevronLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PreviewImage } from "./preview-image";

export { InsightCard, MenuCard, StatCard } from "./page-shell-cards";

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

export function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn("px-4 py-4 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-[96rem] flex flex-col gap-6">
        {children}
      </div>
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
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)]">
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="type-kicker text-[var(--kicker-foreground)]">
              {eyebrow}
            </p>
            <h1 className="type-page-title max-w-4xl text-foreground">
              {title}
            </h1>
            <p className="type-page-description max-w-2xl">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {badges?.map((badge) => (
              <div
                key={badge}
                className="max-w-full overflow-wrap-anywhere rounded-full border border-border/50 bg-muted px-4 py-1.5 text-xs font-bold text-muted-foreground"
              >
                {badge}
              </div>
            ))}
            {actions}
          </div>
        </div>
      </div>
      <div className="min-w-0 flex items-center">{aside}</div>
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
    <section className="relative mb-6">
      <div className="flex flex-col gap-4">
        {backHref && (
          <Link
            href={backHref}
            className="group type-kicker flex w-fit items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            {backLabel}
          </Link>
        )}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex items-start gap-5 sm:gap-8">
            {image ? (
              <PreviewImage
                alt={`${title} image`}
                className="size-20 shrink-0 rounded-xl ring-4 ring-muted/50"
                height={80}
                imageClassName="rounded-xl"
                previewTitle={title}
                src={image}
                width={80}
              />
            ) : avatar ? (
              <div className="size-20 shrink-0 rounded-xl overflow-hidden ring-4 ring-muted/50">
                {avatar}
              </div>
            ) : null}
            <div className="min-w-0 flex-1 pt-0.5 flex flex-col gap-2">
              {eyebrow && (
                <p className="type-kicker text-[var(--kicker-foreground)]">
                  {eyebrow}
                </p>
              )}
              <h1 className="type-page-title text-foreground sm:text-[clamp(2.5rem,4vw,3rem)]">
                {title}
              </h1>
              {description && (
                <p className="type-page-description max-w-3xl">{description}</p>
              )}
            </div>
          </div>

          {headerActions && (
            <div className="flex flex-wrap items-center gap-3 xl:max-w-[28rem] xl:justify-end xl:pt-1">
              {headerActions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
