"use client";

import type { ChangeLogEntry as ChangeLogEntryType } from "@shop/contracts";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CHANGE_OPERATION_META } from "./change-log-meta";
import { FieldDiff } from "./field-diff";

type ChangeLogEntryProps = {
  entry: ChangeLogEntryType;
  defaultExpanded?: boolean;
};

export function ChangeLogEntry({
  entry,
  defaultExpanded = false,
}: ChangeLogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const operation = CHANGE_OPERATION_META[entry.operation];
  const occurredAt = new Date(entry.occurredAt);
  const isViaProduct = entry.parentEntityType === "catalog_product";
  const actorProfileHref = entry.actorSlug
    ? toRoute(`/admin/users/${encodeURIComponent(entry.actorSlug)}` as Route)
    : null;

  // The diff body is only meaningful for updates. created/restored/archived/
  // deleted are summarised by the operation badge alone.
  const hasDiff = entry.changedFields.length > 0;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("w-fit", operation.className)} variant="outline">
            {operation.label}
          </Badge>
          {isViaProduct ? (
            <Badge
              className="w-fit bg-secondary/60 text-secondary-foreground border-0"
              variant="outline"
            >
              via product
            </Badge>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <PersonAvatar
              imageUrl={entry.actorAvatarUrl}
              interactive={false}
              name={entry.actorName}
              size="sm"
            />
            {actorProfileHref ? (
              <Link
                className="type-data-label text-foreground underline-offset-4 hover:underline"
                href={actorProfileHref}
              >
                {entry.actorName}
              </Link>
            ) : (
              <span className="type-data-label text-foreground">
                {entry.actorName}
              </span>
            )}
          </span>
        </div>
        <time
          className="text-sm text-muted-foreground"
          dateTime={entry.occurredAt}
          title={occurredAt.toLocaleString()}
        >
          {formatDistanceToNow(occurredAt, { addSuffix: true })}
        </time>
      </header>

      {hasDiff ? (
        <div className="flex flex-col gap-3">
          <Button
            aria-expanded={isExpanded}
            className="w-fit -ml-2 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded((value) => !value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            {isExpanded ? "Hide changes" : "Show changes"}
            <span className="ml-1 font-mono text-xs">
              ({entry.changedFields.length})
            </span>
          </Button>
          {isExpanded ? (
            <FieldDiff
              after={entry.after}
              before={entry.before}
              changedFields={entry.changedFields}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
