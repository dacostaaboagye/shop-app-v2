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
    <section className="grid gap-6 lg:grid-cols-[1fr,400px]">
      <div className="flex flex-col justify-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              {eyebrow}
            </p>
            <h1 className="font-heading max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-relaxed text-slate-500/80">
              {description}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {badges?.map((badge) => (
              <div key={badge} className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-500 border border-slate-200/50">
                {badge}
              </div>
            ))}
            {actions}
          </div>
        </div>
      </div>
      <div className="flex items-center">
        {aside}
      </div>
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
    <section className="relative">
      <div className="flex flex-col gap-4">
        {backHref && (
          <Link
            href={backHref}
            className="group flex w-fit items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            {backLabel}
          </Link>
        )}

        <div className="flex items-start justify-between gap-8">
          <div className="flex items-start gap-8">
            {image ? (
              <PreviewImage
                alt={`${title} image`}
                className="size-20 shrink-0 rounded-2xl shadow-xl shadow-black/5 ring-8 ring-slate-50/50"
                height={80}
                imageClassName="rounded-2xl"
                previewTitle={title}
                src={image}
                width={80}
              />
            ) : avatar ? (
              <div className="size-20 shrink-0 shadow-xl shadow-black/5 rounded-2xl overflow-hidden ring-8 ring-slate-50/50">{avatar}</div>
            ) : null}
            <div className="flex-1 pt-0.5 space-y-2">
              {eyebrow && (
                <p className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                  {eyebrow}
                </p>
              )}
              <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {title}
              </h1>
              {description && (
                <p className="max-w-3xl text-base font-medium leading-relaxed text-slate-500/80">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {headerActions && (
            <div className="flex shrink-0 items-center gap-3 pt-1">
              {headerActions}
            </div>
          )}
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
    <div className={cn(
      "group relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-2xl border-0 bg-white p-8 shadow-lg shadow-black/[0.02] transition-all hover:shadow-xl hover:shadow-black/[0.04]",
      href && "cursor-pointer active:scale-[0.98]"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            {label}
          </p>
          <h3 className="font-heading text-4xl font-bold tracking-tight tabular-nums text-slate-900 capitalize">
            {value}
          </h3>
        </div>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="size-6" />
        </div>
      </div>
      {description && (
        <p className="mt-6 text-xs font-bold text-slate-400/80">
          {description}
        </p>
      )}
    </div>
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
    <div className={cn(
      "overflow-hidden rounded-2xl border-0 bg-white p-10 shadow-xl shadow-black/[0.03]",
      className
    )}>
      <div className="mb-10 flex flex-col gap-2">
        <p className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          {eyebrow}
        </p>
        <h3 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        {description && (
          <p className="text-base font-medium text-slate-500/80">
            {description}
          </p>
        )}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

type MenuCardProps = {
  description: string;
  href: Route;
  icon: LucideIcon;
  title: string;
};

export function MenuCard({
  description,
  href,
  icon: Icon,
  title,
}: MenuCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full border-0 bg-white p-8 shadow-lg shadow-black/[0.02] transition-all hover:shadow-xl hover:shadow-black/[0.04] hover:bg-slate-50/50">
        <CardHeader className="p-0 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="size-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-sm font-medium leading-relaxed text-slate-500/80">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
