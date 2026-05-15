"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, FileCheck2 } from "lucide-react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { downloadDocumentFile } from "@/lib/documents/document-file-actions";
import {
  downloadStockTakeVarianceReportPdf,
  type StockTakeApplyResponse,
  type StockTakeDetailResponse,
  type StockTakePortal,
} from "@/lib/react-query/stock-takes";

type StockTakeFinalReportCardProps = {
  applyResult: StockTakeApplyResponse | null;
  portal: StockTakePortal;
  stockTake: StockTakeDetailResponse;
};

export function StockTakeFinalReportCard({
  applyResult,
  portal,
  stockTake,
}: StockTakeFinalReportCardProps) {
  const reportMutation = useMutation({
    mutationFn: () =>
      downloadStockTakeVarianceReportPdf(portal, stockTake.stockTakeReference),
    onSuccess: downloadDocumentFile,
  });
  const isApplied = stockTake.status === "applied" || applyResult !== null;
  if (!isApplied) return null;

  const summary = applyResult?.summary ?? buildSummary(stockTake.lines);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Applied</Badge>
          <Badge variant="secondary">Audit evidence</Badge>
        </div>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary" />
          Final variance report
        </CardTitle>
        <CardDescription>
          Download the applied stock-take evidence for reconciliation and
          sign-off.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <ReportStat label="Changed" value={summary.changedRows} />
          <ReportStat label="No change" value={summary.noChangeRows} />
          <ReportStat
            label="Positive delta"
            value={getPositiveDelta(summary)}
          />
          <ReportStat
            label="Negative delta"
            value={getNegativeDelta(summary)}
          />
        </div>
        <Alert>
          <AlertTitle>Report source</AlertTitle>
          <AlertDescription>
            Generated from persisted applied stock-take lines, not from the
            browser preview.
          </AlertDescription>
        </Alert>
        {reportMutation.error ? (
          <AppErrorBanner
            detail="The stock-take was applied, but the variance report could not be downloaded. Retry with this reference."
            error={reportMutation.error}
            title="Variance report unavailable"
          />
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          disabled={reportMutation.isPending}
          onClick={() => reportMutation.mutate()}
          type="button"
          variant="outline"
        >
          {reportMutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : null}
          <Download data-icon="inline-start" />
          Download PDF
        </Button>
      </CardFooter>
    </Card>
  );
}

function buildSummary(lines: StockTakeDetailResponse["lines"]) {
  const applied = lines.filter((line) => line.countedQuantity !== null);
  return {
    changedRows: applied.filter((line) => (line.appliedDelta ?? 0) !== 0)
      .length,
    negativeDelta: applied.reduce(
      (sum, line) => sum + Math.min(line.appliedDelta ?? 0, 0),
      0,
    ),
    noChangeRows: applied.filter((line) => (line.appliedDelta ?? 0) === 0)
      .length,
    positiveDelta: applied.reduce(
      (sum, line) => sum + Math.max(line.appliedDelta ?? 0, 0),
      0,
    ),
  };
}

function getPositiveDelta(
  summary: ReturnType<typeof buildSummary> | StockTakeApplyResponse["summary"],
): number {
  return "positiveDelta" in summary
    ? summary.positiveDelta
    : summary.totalPositiveDelta;
}

function getNegativeDelta(
  summary: ReturnType<typeof buildSummary> | StockTakeApplyResponse["summary"],
): number {
  return "negativeDelta" in summary
    ? summary.negativeDelta
    : summary.totalNegativeDelta;
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="type-support text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">
        {new Intl.NumberFormat().format(value)}
      </p>
    </div>
  );
}
