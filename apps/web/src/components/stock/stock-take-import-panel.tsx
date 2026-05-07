"use client";

import { useMutation } from "@tanstack/react-query";
import { FileCheck2, FileSearch, Upload } from "lucide-react";
import { useId, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  dryRunStockTakeImport,
  type StockTakeImportDryRunRequest,
  type StockTakeImportDryRunResponse,
  type StockTakePortal,
} from "@/lib/react-query/stock-takes";
import {
  buildStockTakeImportRequest,
  formatFileSize,
  getImportFileKind,
  getImportFileSignature,
  getImportFileValidationError,
} from "./stock-take-import-review.support";

type StockTakeImportPanelProps = {
  onDryRun: (input: {
    dryRun: StockTakeImportDryRunResponse;
    fileSignature: string;
    request: StockTakeImportDryRunRequest;
  }) => void;
  onFileSignatureChange: (fileSignature: string | null) => void;
  onPreviewReset: () => void;
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeImportPanel({
  onDryRun,
  onFileSignatureChange,
  onPreviewReset,
  portal,
  reference,
}: StockTakeImportPanelProps) {
  const inputId = useId();
  const [inputKey, setInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const selectedKind = selectedFile ? getImportFileKind(selectedFile) : null;
  const dryRunMutation = useMutation({
    mutationFn: async (file: File) => {
      const request = await buildStockTakeImportRequest(file);
      const dryRun = await dryRunStockTakeImport(portal, reference, request);

      return {
        dryRun,
        fileSignature: getImportFileSignature(file),
        request,
      };
    },
    onSuccess: onDryRun,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="size-4 text-primary" />
          Upload completed workbook
        </CardTitle>
        <CardDescription>
          Upload the counted workbook or CSV fallback to validate it against
          this stock-take. Preview only. No stock has changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={inputId}
          >
            Workbook or CSV file
          </label>
          <Input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv,application/vnd.ms-excel"
            disabled={dryRunMutation.isPending}
            id={inputId}
            key={inputKey}
            onChange={(event) => {
              setFileError(null);
              onPreviewReset();
              const file = event.currentTarget.files?.[0] ?? null;
              setSelectedFile(file);
              onFileSignatureChange(file ? getImportFileSignature(file) : null);
              setInputKey((key) => key + 1);
            }}
            type="file"
          />
          <p className="type-support text-muted-foreground">
            Use the downloaded `.xlsx` workbook first. Save it after editing in
            Excel, then select it again before running the preview. CSV remains
            a fallback for integrations.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ImportFormatCard
              description="Primary path. Keeps the controlled stock-take line order and read-only system columns."
              label="XLSX workbook"
              limit="3.75 MB"
            />
            <ImportFormatCard
              description="Fallback for integrations or recovery. Must keep lineNumber, sku, and countedQuantity."
              label="CSV fallback"
              limit="1 MB"
            />
          </div>
          {fileError ? (
            <p className="text-sm font-medium text-destructive">{fileError}</p>
          ) : null}
        </div>

        {dryRunMutation.error ? (
          <AppErrorBanner
            detail="The dry-run could not be completed. Confirm the file format and your stock-take access, then try again."
            error={dryRunMutation.error}
            title="Unable to preview import"
          />
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SelectedFileSummary file={selectedFile} kind={selectedKind} />
        <Button
          disabled={dryRunMutation.isPending}
          onClick={() => {
            if (!selectedFile) {
              setFileError(
                "Choose a workbook or CSV file before running the preview.",
              );
              return;
            }

            const validationError = getImportFileValidationError(selectedFile);
            if (validationError) {
              setFileError(validationError);
              return;
            }

            onPreviewReset();
            dryRunMutation.mutate(selectedFile);
          }}
          type="button"
        >
          {dryRunMutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Upload data-icon="inline-start" />
          )}
          Run preview
        </Button>
      </CardFooter>
    </Card>
  );
}

function ImportFormatCard({
  description,
  label,
  limit,
}: {
  description: string;
  label: string;
  limit: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Badge variant="secondary">Max {limit}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SelectedFileSummary({
  file,
  kind,
}: {
  file: File | null;
  kind: ReturnType<typeof getImportFileKind> | null;
}) {
  if (!file || !kind) {
    return <p className="text-sm text-muted-foreground">No file selected</p>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <FileCheck2 className="size-4 text-primary" />
        <p className="truncate text-sm font-medium text-foreground">
          {file.name}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {kind.label} · {formatFileSize(file.size)}
      </p>
    </div>
  );
}
