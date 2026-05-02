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
import {
  CHANGE_ENTITY_LABEL,
  CHANGE_OPERATION_META,
  looksLikeUuid,
} from "./change-log-meta";
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
  const entityLabel = CHANGE_ENTITY_LABEL[entry.entityType];
  const occurredAt = new Date(entry.occurredAt);
  const actorProfileHref = entry.actorSlug
    ? toRoute(`/admin/users/${encodeURIComponent(entry.actorSlug)}` as Route)
    : null;

  // Display name is the headline subject. Fall back to the ref only if the
  // backend can't resolve a name (entity hard-deleted) AND the ref is
  // human-readable — never expose raw UUIDs to operators.
  const refIsHumanReadable = !looksLikeUuid(entry.entityRef);
  const primarySubject =
    entry.entityName ?? (refIsHumanReadable ? entry.entityRef : null);
  // Show the public ref as supporting metadata only when it carries useful
  // information beyond the headline: not a UUID, and meaningfully different
  // from the display name (case-insensitive).
  const showSupportingRef =
    refIsHumanReadable &&
    entry.entityName !== null &&
    entry.entityName.toLowerCase() !== entry.entityRef.toLowerCase();
  const hasSupportingLine =
    showSupportingRef || entry.parentEntityName !== null;

  // The diff body is only meaningful for updates. created/restored/archived/
  // deleted are summarised by the operation badge alone.
  const hasDiff = entry.changedFields.length > 0;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4">
      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn("w-fit", operation.className)}
              variant="outline"
            >
              {operation.label}
            </Badge>
            <span className="text-base font-semibold text-foreground">
              {entityLabel}
              {primarySubject ? (
                <>
                  {" · "}
                  <span className="text-foreground">{primarySubject}</span>
                </>
              ) : null}
            </span>
          </div>
          {hasSupportingLine ? (
            <p className="text-xs text-muted-foreground">
              {showSupportingRef ? (
                <span className="font-mono">{entry.entityRef}</span>
              ) : null}
              {showSupportingRef && entry.parentEntityName ? " · " : null}
              {entry.parentEntityName ? (
                <>
                  in{" "}
                  <span className="text-foreground">
                    {entry.parentEntityName}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-sm text-muted-foreground">·</span>
            <time
              className="text-sm text-muted-foreground"
              dateTime={entry.occurredAt}
              title={occurredAt.toLocaleString()}
            >
              {formatDistanceToNow(occurredAt, { addSuffix: true })}
            </time>
          </div>
        </div>
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
