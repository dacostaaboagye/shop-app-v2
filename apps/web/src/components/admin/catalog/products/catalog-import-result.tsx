import type {
  CatalogImportJobResponse,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import { Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  formatImportStatus,
  getImportStatusCopy,
} from "./catalog-import-dialog.support";

export function CatalogImportResult({
  job,
  jobError,
  jobPending,
  onReport,
  pendingReport,
  result,
}: {
  job: CatalogImportJobResponse | null;
  jobError: Error | null;
  jobPending: boolean;
  onReport: () => void;
  pendingReport: boolean;
  result: CatalogImportUploadResponse;
}) {
  const status = job?.status ?? result.status;
  const reportAvailable = job?.reportAvailable ?? false;
  const summary = job?.summary ?? null;

  return (
    <Alert variant={status === "completed" ? "success" : "warning"}>
      <AlertTitle>Import {formatImportStatus(status)}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{getImportStatusCopy(status, result)}</span>
        {summary ? (
          <span className="grid gap-2 sm:grid-cols-3">
            <SummaryCount label="Total rows" value={summary.totalRows} />
            <SummaryCount label="Imported" value={summary.validRows} />
            <SummaryCount label="Failed" value={summary.invalidRows} />
          </span>
        ) : null}
        {jobPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> Checking import progress...
          </span>
        ) : null}
        {jobError ? (
          <span>
            The import was accepted, but its latest status could not be loaded.
            Keep this dialog open to retry automatically.
          </span>
        ) : null}
      </AlertDescription>
      {reportAvailable ? (
        <Button
          className="mt-3 w-fit"
          disabled={pendingReport}
          onClick={onReport}
          size="sm"
          type="button"
          variant="outline"
        >
          {pendingReport ? <Spinner /> : <Download data-icon="inline-start" />}
          Download failed rows
        </Button>
      ) : null}
    </Alert>
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
