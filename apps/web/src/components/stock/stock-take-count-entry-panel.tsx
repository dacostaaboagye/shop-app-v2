"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSearch, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  dryRunStockTakeImport,
  fetchStockTakeDetail,
  type StockTakeDetailResponse,
  type StockTakeImportDryRunRequest,
  type StockTakeImportDryRunResponse,
  type StockTakePortal,
  stockTakeQueryKey,
} from "@/lib/react-query/stock-takes";
import {
  type LineCountSaveStatus,
  useUpdateStockTakeLineCounts,
} from "@/lib/react-query/use-stock-take-line-counts";
import { CountEntryRow } from "./stock-take-count-entry-row";
import {
  buildInAppCountsCsvRequest,
  getInAppCountsFileSignature,
} from "./stock-take-in-app-counts.support";

type StockTakeCountEntryPanelProps = {
  detail: StockTakeDetailResponse;
  onDryRun: (input: {
    dryRun: StockTakeImportDryRunResponse;
    fileSignature: string;
    request: StockTakeImportDryRunRequest;
  }) => void;
  onFileSignatureChange: (fileSignature: string | null) => void;
  onPreviewReset: () => void;
  portal: StockTakePortal;
};

export function StockTakeCountEntryPanel({
  detail,
  onDryRun,
  onFileSignatureChange,
  onPreviewReset,
  portal,
}: StockTakeCountEntryPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const searchId = useId();
  const isLocked = detail.status === "applied" || detail.status === "cancelled";
  const lineCounts = useUpdateStockTakeLineCounts({
    portal,
    reference: detail.stockTakeReference,
  });
  const filtered = useMemo(
    () => filterLines(detail.lines, search),
    [detail.lines, search],
  );

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await lineCounts.flushNow();
      const fresh = await queryClient.fetchQuery({
        queryFn: () => fetchStockTakeDetail(portal, detail.stockTakeReference),
        queryKey: stockTakeQueryKey(portal, detail.stockTakeReference),
      });
      const request = buildInAppCountsCsvRequest(fresh);
      const dryRun = await dryRunStockTakeImport(
        portal,
        detail.stockTakeReference,
        request,
      );
      return {
        dryRun,
        fileSignature: getInAppCountsFileSignature(detail.stockTakeReference),
        request,
      };
    },
    onSuccess: onDryRun,
  });

  function handleReview() {
    onPreviewReset();
    onFileSignatureChange(
      getInAppCountsFileSignature(detail.stockTakeReference),
    );
    reviewMutation.mutate();
  }

  const reviewDisabled =
    isLocked || reviewMutation.isPending || detail.lines.length === 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle>Enter counts in app</CardTitle>
          <CardDescription>
            Save counted quantities and notes line by line. Each row saves on
            blur. Click review counts when every line is ready.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-1 md:w-72">
          <label
            className="type-support text-muted-foreground"
            htmlFor={searchId}
          >
            Search this session
          </label>
          <div className="relative flex items-center">
            <Search
              aria-hidden="true"
              className="absolute left-3 size-4 text-muted-foreground"
            />
            <Input
              className="pl-9"
              disabled={isLocked}
              id={searchId}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Product, variant, or SKU"
              type="search"
              value={search}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {detail.lines.length === 0 ? (
          <AppEmptyState
            description="Generate or import a sheet to populate this stock-take session before entering counts."
            title="No lines to count yet"
          />
        ) : filtered.length === 0 ? (
          <AppEmptyState
            description="No session lines match this search. Adjust the search to find a different product, variant, or SKU."
            title="No matching lines"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((line) => (
              <CountEntryRow
                isLocked={isLocked}
                key={line.lineNumber}
                line={line}
                onCommit={(entry) => lineCounts.queueEntry(entry)}
                status={
                  lineCounts.lineStatuses.get(line.lineNumber) ?? IDLE_STATUS
                }
              />
            ))}
          </ul>
        )}

        {reviewMutation.error ? (
          <AppErrorBanner
            detail="Counts could not be reviewed. Confirm your access and try again."
            error={reviewMutation.error}
            title="Unable to review counts"
          />
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {detail.lines.length} line{detail.lines.length === 1 ? "" : "s"} in
          this session
        </p>
        <Button disabled={reviewDisabled} onClick={handleReview} type="button">
          {reviewMutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <FileSearch data-icon="inline-start" />
          )}
          Review counts
        </Button>
      </CardFooter>
    </Card>
  );
}

const IDLE_STATUS: LineCountSaveStatus = { error: null, state: "idle" };

function filterLines(
  lines: StockTakeDetailResponse["lines"],
  search: string,
): StockTakeDetailResponse["lines"] {
  const trimmed = search.trim().toLowerCase();
  if (trimmed.length === 0) return lines;
  return lines.filter((line) => {
    const haystack = [line.productName, line.variantName, line.sku]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase())
      .join(" ");
    return haystack.includes(trimmed);
  });
}
