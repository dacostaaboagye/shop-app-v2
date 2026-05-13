"use client";

import type {
  StockMovementListResponse,
  StockMovementSummary,
} from "@shop/contracts";
import { AppDataTable } from "@/components/data-table/app-data-table";
import { AppPagination } from "@/components/data-table/app-pagination";
import { stockMovementHistoryColumns } from "@/components/stock/stock-movement-history-columns";
import { StockWorkspaceTableSkeleton } from "@/components/stock/stock-workspace-feedback";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { formatMovementLabel } from "./stock-movement-history.support";

type StockMovementResultsProps = {
  data: StockMovementListResponse | undefined;
  emptyDescription: string;
  emptyTitle: string;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRetry: () => void;
  page: number;
  pageSize: number;
};

export function StockMovementResults({
  data,
  emptyDescription,
  emptyTitle,
  error,
  isError,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRetry,
  page,
  pageSize,
}: StockMovementResultsProps) {
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <StockWorkspaceTableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <AppErrorBanner
          detail="Could not load stock movements for the selected filters."
          error={error}
          onRetry={onRetry}
          title="Unable to load stock movements"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <AppEmptyState
        description={emptyDescription}
        kind="no-results"
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <StockMovementCardList items={items} />
      </div>
      <div className="hidden md:block">
        <AppDataTable
          columns={stockMovementHistoryColumns}
          data={items}
          density="compact"
          emptyDescription={emptyDescription}
          emptyTitle={emptyTitle}
          getRowId={movementCardKey}
        />
      </div>
      <AppPagination
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        page={page}
        pageSize={pageSize}
        totalCount={data?.totalCount ?? 0}
      />
    </div>
  );
}

function StockMovementCardList({ items }: { items: StockMovementSummary[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <StockMovementCard item={item} key={movementCardKey(item)} />
      ))}
    </div>
  );
}

function StockMovementCard({ item }: { item: StockMovementSummary }) {
  const deltaTone =
    item.quantityDelta > 0
      ? "border-success/40 bg-success/10 text-success"
      : "border-destructive/30 bg-destructive/10 text-destructive";

  return (
    <article className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {item.productName}
          </p>
          <p className="type-support text-muted-foreground">
            {item.variantName}
          </p>
        </div>
        <Badge className={deltaTone} variant="outline">
          {item.quantityDelta > 0
            ? `+${item.quantityDelta}`
            : item.quantityDelta}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <StockMovementCardField label="SKU" value={item.sku} />
        <StockMovementCardField label="Location" value={item.locationName} />
        <StockMovementCardField
          label="Movement"
          value={formatMovementLabel(item.movementType)}
        />
        <StockMovementCardField
          label="Source"
          value={`${formatMovementLabel(item.sourceType)} - ${
            item.sourceReference ?? "Reference hidden"
          }`}
        />
        <StockMovementCardField
          label="Actor"
          value={item.actorName ?? "System"}
        />
        <StockMovementCardField
          label="Occurred"
          value={formatMovementDate(item.occurredAt)}
        />
      </div>
    </article>
  );
}

function StockMovementCardField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="type-data-label text-muted-foreground">{label}</p>
      <p className="overflow-wrap-anywhere text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function movementCardKey(item: StockMovementSummary): string {
  return [
    item.occurredAt,
    item.locationSlug,
    item.sku,
    item.sourceType,
    item.sourceReference ?? "hidden",
    item.quantityDelta,
    item.actorUserSlug ?? "system",
  ].join(":");
}

function formatMovementDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
