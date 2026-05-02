"use client";

import { History } from "lucide-react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CatalogHistoryEntityKind,
  useCatalogChangeLog,
} from "@/lib/react-query/admin-catalog-history";
import { ChangeLogEntry } from "./change-log-entry";

type CatalogHistoryListProps = {
  entityKind: CatalogHistoryEntityKind;
  slug: string;
  enabled?: boolean;
};

export function CatalogHistoryList({
  entityKind,
  slug,
  enabled = true,
}: CatalogHistoryListProps) {
  const query = useCatalogChangeLog({ enabled, entityKind, slug });

  if (query.isPending && enabled) {
    return <HistoryListSkeleton />;
  }

  if (query.isError) {
    return (
      <AppErrorBanner
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
        title="Unable to load change history"
      />
    );
  }

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];

  if (entries.length === 0) {
    return (
      <AppEmptyState
        description="No changes have been recorded yet. Edits, archives, and restores will appear here."
        icon={History}
        title="No history yet"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <ChangeLogEntry
          entry={entry}
          key={`${entry.entityRef}-${entry.occurredAt}-${entry.operation}`}
        />
      ))}
      {query.hasNextPage ? (
        <Button
          className="w-fit"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {query.isFetchingNextPage ? "Loading more" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

function HistoryListSkeleton() {
  return (
    <div className="flex flex-col gap-3" data-testid="history-skeleton">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
