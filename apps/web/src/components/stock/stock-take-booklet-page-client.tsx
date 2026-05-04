"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import type { Route } from "next";
import { AppErrorBanner, AppErrorState } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  downloadStockTakeSheetCsv,
  fetchStockTakeDetail,
  type StockTakePortal,
  stockTakeQueryKey,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { StockTakeBookletPrint } from "./stock-take-booklet-print";

type StockTakeBookletPageClientProps = {
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeBookletPageClient({
  portal,
  reference,
}: StockTakeBookletPageClientProps) {
  const detailQuery = useQuery({
    queryFn: () => fetchStockTakeDetail(portal, reference),
    queryKey: stockTakeQueryKey(portal, reference),
  });
  const csvMutation = useMutation({
    mutationFn: () => downloadStockTakeSheetCsv(portal, reference),
    onSuccess(file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <PageShell className="stock-take-screen">
      <div className="stock-take-no-print">
        <PageHeader
          actions={
            <>
              <Button
                disabled={csvMutation.isPending}
                onClick={() => csvMutation.mutate()}
                size="sm"
                type="button"
                variant="outline"
              >
                {csvMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Download data-icon="inline-start" />
                )}
                CSV
              </Button>
              <Button onClick={() => window.print()} size="sm" type="button">
                <Printer data-icon="inline-start" />
                Print
              </Button>
            </>
          }
          backHref={getBackHref(portal)}
          backLabel="Stock-take sheets"
          description="Print this booklet for physical count capture and sign-off."
          eyebrow="Printable stock-take booklet"
          title={reference}
        />
        {csvMutation.error ? (
          <AppErrorBanner
            detail="The booklet is still available to print, but the CSV download failed."
            error={csvMutation.error}
            title="Unable to download CSV"
          />
        ) : null}
      </div>

      {detailQuery.isPending ? (
        <Skeleton className="h-[720px] rounded-xl" />
      ) : detailQuery.isError ? (
        <AppErrorState
          detail="The generated stock-take booklet could not be loaded."
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
          title="Booklet unavailable"
        />
      ) : (
        <StockTakeBookletPrint stockTake={detailQuery.data} />
      )}
    </PageShell>
  );
}

function getBackHref(portal: StockTakePortal): Route {
  return toRoute(`/${portal}/stock/takes`);
}
