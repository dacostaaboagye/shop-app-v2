"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/display/format";

export function AccessNameCell({
  description,
  name,
  slug,
}: {
  description?: string | null | undefined;
  name: string;
  slug?: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-balance font-medium text-foreground">{name}</p>
      {description ? (
        <p className="type-support mt-1 text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      {slug ? (
        <p className="type-identifier mt-1 break-all text-muted-foreground">
          {slug}
        </p>
      ) : null}
    </div>
  );
}

export function AccessTextCell({
  tone = "support",
  value,
}: {
  tone?: "identifier" | "support";
  value?: string | null | undefined;
}) {
  if (!value) {
    return <span className="type-support text-muted-foreground">Not set</span>;
  }

  return tone === "identifier" ? (
    <span className="type-identifier break-all text-muted-foreground">
      {value}
    </span>
  ) : (
    <span className="type-support text-pretty text-muted-foreground">
      {value}
    </span>
  );
}

export function AccessCountCell({ value }: { value: number }) {
  return (
    <span className="type-inline-metric tabular-nums text-foreground">
      {formatCount(value)}
    </span>
  );
}

export function AccessActionBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      className="border-border bg-muted/30 text-foreground"
      variant="outline"
    >
      {children}
    </Badge>
  );
}
