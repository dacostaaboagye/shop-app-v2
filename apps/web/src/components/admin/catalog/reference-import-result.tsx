import type { CatalogReferenceImportResponse } from "@shop/contracts";
import { Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getFailedRowSummary,
  getReferenceImportResultCopy,
  referenceFailedRowsToCsv,
} from "./reference-import-dialog.support";

type ReferenceImportResultProps = {
  onDownload: (fileName: string, content: string) => void;
  result: CatalogReferenceImportResponse;
};

export function ReferenceImportResult({
  onDownload,
  result,
}: ReferenceImportResultProps) {
  const hasFailures = result.failedRows.length > 0;

  return (
    <Alert variant={hasFailures ? "warning" : "success"}>
      <AlertTitle>
        {hasFailures ? "Import needs review" : "Import complete"}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{getReferenceImportResultCopy(result)}</span>
        <span className="grid gap-2 sm:grid-cols-3">
          <SummaryCount label="Total rows" value={result.summary.totalRows} />
          <SummaryCount label="Imported" value={result.summary.importedRows} />
          <SummaryCount label="Failed" value={result.summary.failedRows} />
        </span>
        {hasFailures ? (
          <FailedRows onDownload={onDownload} result={result} />
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function FailedRows({ onDownload, result }: ReferenceImportResultProps) {
  return (
    <div className="flex flex-col gap-3">
      <Separator />
      <div className="flex flex-col gap-2">
        {result.failedRows.slice(0, 3).map((row) => (
          <span
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={`${row.rowNumber}-${getFailedRowSummary(row)}-${JSON.stringify(row.originalRow)}`}
          >
            <span className="font-medium">Row {row.rowNumber}: </span>
            {getFailedRowSummary(row)}
          </span>
        ))}
      </div>
      <Button
        className="w-fit"
        onClick={() =>
          onDownload(
            `${result.entity}-import-failed-rows.csv`,
            referenceFailedRowsToCsv(result),
          )
        }
        size="sm"
        type="button"
        variant="outline"
      >
        <Download data-icon="inline-start" />
        Download failed rows
      </Button>
    </div>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md border border-border/60 bg-background px-3 py-2">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}
