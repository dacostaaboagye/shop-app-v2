"use client";

import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type AppBannerTone = "error" | "info" | "success" | "warning";

type AppBannerProps = {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
  tone?: AppBannerTone;
};

const BANNER_META: Record<
  AppBannerTone,
  {
    icon: LucideIcon;
    variant: "default" | "destructive" | "success" | "warning";
  }
> = {
  error: { icon: CircleAlert, variant: "destructive" },
  info: { icon: Info, variant: "default" },
  success: { icon: CircleCheckBig, variant: "success" },
  warning: { icon: TriangleAlert, variant: "warning" },
};

export function AppBanner({
  action,
  className,
  description,
  icon,
  title,
  tone = "info",
}: AppBannerProps) {
  const meta = BANNER_META[tone];
  const Icon = icon ?? meta.icon;

  return (
    <Alert
      className={cn("rounded-xl border border-border/50 shadow-sm", className)}
      variant={meta.variant}
    >
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}
