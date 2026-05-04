"use client";

import { useQuery } from "@tanstack/react-query";
import { FileDown, Printer } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { AppErrorState } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchStockTakeDetail,
  type StockTakeImportDryRunResponse,
  type StockTakePortal,
  stockTakeQueryKey,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { StockTakeImportErrors } from "./stock-take-import-errors";
import { StockTakeImportPanel } from "./stock-take-import-panel";
import { StockTakeImportPreview } from "./stock-take-import-preview";
import { StockTakeImportSummary } from "./stock-take-import-summary";

type StockTakeReviewPageClientProps = {
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeReviewPageClient({
  portal,
  reference,
}: StockTakeReviewPageClientProps) {
  const [dryRun, setDryRun] = useState<StockTakeImportDryRunResponse | null>(
    null,
  );
  const detailQuery = useQuery({
    queryFn: () => fetchStockTakeDetail(portal, reference),
    queryKey: stockTakeQueryKey(portal, reference),
  });

  return (
    <PageShell>
      <PageHeader
        actions={
          <>
            <Link
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              href={toRoute(`/${portal}/stock/takes`)}
            >
              <FileDown data-icon="inline-start" />
              Sheets
            </Link>
            <Link
              className={cn(buttonVariants({ size: "sm", variant: "default" }))}
              href={getBookletHref(portal, reference)}
            >
              <Printer data-icon="inline-start" />
              Booklet
            </Link>
          </>
        }
        backHref={toRoute(`/${portal}/stock/takes`)}
        backLabel="Stock-take sheets"
        description="Dry-run a counted CSV before any stock is adjusted. Preview only. No stock has changed."
        eyebrow="Stock-take import review"
        title={reference}
      />

      {detailQuery.isPending ? (
        <ReviewSkeleton />
      ) : detailQuery.isError ? (
        <AppErrorState
          detail="The stock-take could not be loaded for import review."
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
          title="Review unavailable"
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <StockTakeImportPanel
              onDryRun={setDryRun}
              onPreviewReset={() => setDryRun(null)}
              portal={portal}
              reference={reference}
            />
            {dryRun ? (
              <>
                <StockTakeImportSummary dryRun={dryRun} />
                <StockTakeImportPreview rows={dryRun.rows} />
                <StockTakeImportErrors errors={dryRun.errors} />
              </>
            ) : (
              <StockTakeImportPreview rows={[]} />
            )}
          </div>
          <aside className="flex flex-col gap-4">
            <StockTakeContextCard
              locationName={detailQuery.data.locationName}
              locationSlug={detailQuery.data.locationSlug}
              status={detailQuery.data.status}
              stockTakeReference={detailQuery.data.stockTakeReference}
            />
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function StockTakeContextCard({
  locationName,
  locationSlug,
  status,
  stockTakeReference,
}: {
  locationName: string;
  locationSlug: string;
  status: string;
  stockTakeReference: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">
          Preview only
        </Badge>
        <div>
          <p className="type-support text-muted-foreground">Reference</p>
          <p className="font-semibold text-foreground">{stockTakeReference}</p>
        </div>
        <div>
          <p className="type-support text-muted-foreground">Location</p>
          <p className="font-medium text-foreground">{locationName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {locationSlug}
          </p>
        </div>
        <div>
          <p className="type-support text-muted-foreground">Current status</p>
          <p className="font-medium text-foreground">{status}</p>
        </div>
        <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
          No stock has changed. This screen validates the file and reports what
          would happen in a later apply step.
        </p>
      </div>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function getBookletHref(portal: StockTakePortal, reference: string): Route {
  return toRoute(
    `/${portal}/stock/takes/${encodeURIComponent(reference)}/booklet`,
  );
}
