"use client";

import { useMutation } from "@tanstack/react-query";
import { FileSearch, Upload } from "lucide-react";
import { useId, useState } from "react";
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
  type StockTakeImportDryRunRequest,
  type StockTakeImportDryRunResponse,
  type StockTakePortal,
} from "@/lib/react-query/stock-takes";
import {
  buildStockTakeImportRequest,
  getImportFileSignature,
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
        <p className="text-sm text-muted-foreground">
          {selectedFile ? selectedFile.name : "No file selected"}
        </p>
        <Button
          disabled={dryRunMutation.isPending}
          onClick={() => {
            if (!selectedFile) {
              setFileError(
                "Choose a workbook or CSV file before running the preview.",
              );
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
