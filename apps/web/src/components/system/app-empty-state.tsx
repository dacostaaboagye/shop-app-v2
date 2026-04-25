"use client";

import type { LucideIcon } from "lucide-react";
import { FolderOpen, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type AppEmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description: string;
  icon?: LucideIcon;
  kind?: "no-data" | "no-results";
  title: string;
};

export function AppEmptyState({
  action,
  className,
  description,
  icon,
  kind = "no-data",
  title,
}: AppEmptyStateProps) {
  const Icon = icon ?? (kind === "no-results" ? Search : FolderOpen);

  return (
    <Empty
      className={cn(
        "rounded-xl border border-border/60 bg-card/80 px-5 py-8 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia
          className={cn(
            "size-11 rounded-xl ring-1 ring-border/60",
            kind === "no-results"
              ? "bg-secondary/70 text-secondary-foreground"
              : "bg-primary/10 text-primary",
          )}
          variant="icon"
        >
          <Icon className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
