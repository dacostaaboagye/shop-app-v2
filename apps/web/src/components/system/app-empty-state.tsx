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
        "border-border bg-linear-to-b from-background to-muted/45 px-5 py-8",
        className,
      )}
    >
      <EmptyHeader>
        <EmptyMedia
          className={cn(
            "size-11 rounded-2xl ring-1 ring-border",
            kind === "no-results"
              ? "bg-secondary text-secondary-foreground"
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
