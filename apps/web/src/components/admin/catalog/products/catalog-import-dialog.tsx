"use client";

import type {
  CatalogImportJobResponse,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  adminCatalogImportJobQueryKey,
  fetchCatalogImportJob,
  fetchCatalogImportReport,
  fetchCatalogImportTemplate,
  startCatalogImport,
} from "@/lib/react-query/admin-catalog-import";
import {
  canStartCatalogImport,
  failedRowsToCsv,
  isTerminalImportStatus,
  shouldRefreshProductList,
} from "./catalog-import-dialog.support";
import { CatalogImportResult } from "./catalog-import-result";

export function CatalogImportDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] =
    useState<CatalogImportUploadResponse | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [invalidatedJobReference, setInvalidatedJobReference] = useState<
    string | null
  >(null);
  const templateMutation = useMutation({
    mutationFn: fetchCatalogImportTemplate,
    onSuccess: (template) =>
      downloadTextFile("catalog-import-template.csv", template.csv),
  });
  const importMutation = useMutation({
    mutationFn: async (file: File) =>
      startCatalogImport({
        contentType: normalizeContentType(file),
        csv: await file.text(),
        fileName: file.name,
      }),
    onSuccess: (result) => {
      setUploadResult(result);
      setInvalidatedJobReference(null);
    },
  });
  const jobReference = uploadResult?.jobReference ?? null;
  const jobQuery = useQuery({
    enabled: open && jobReference !== null,
    queryFn: () => fetchCatalogImportJob(jobReference ?? ""),
    queryKey: adminCatalogImportJobQueryKey(jobReference ?? ""),
    refetchInterval: (query) => {
      const job = query.state.data as CatalogImportJobResponse | undefined;
      return job && isTerminalImportStatus(job.status) ? false : 2_000;
    },
  });
  const reportMutation = useMutation({
    mutationFn: async (reference: string) =>
      fetchCatalogImportReport(reference),
    onSuccess: (report) =>
      downloadTextFile(
        `${report.jobReference}-failed-rows.csv`,
        failedRowsToCsv(report),
      ),
  });
  const job = jobQuery.data ?? null;
  const canStartImport = canStartCatalogImport({
    hasAcceptedJob: uploadResult !== null,
    hasSelectedFile: selectedFile !== null,
    importPending: importMutation.isPending,
  });

  useEffect(() => {
    if (!job || invalidatedJobReference === job.jobReference) return;
    if (!shouldRefreshProductList(job.status)) return;

    setInvalidatedJobReference(job.jobReference);
    void queryClient.invalidateQueries({
      queryKey: ["admin", "catalog", "products"],
    });
  }, [invalidatedJobReference, job, queryClient]);

  const resetDialogState = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setFileInputKey((current) => current + 1);
    setInvalidatedJobReference(null);
    templateMutation.reset();
    importMutation.reset();
    reportMutation.reset();
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetDialogState();
      }}
      open={open}
    >
      <DialogTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        <FileUp data-icon="inline-start" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import catalogue products</DialogTitle>
          <DialogDescription>
            Upload a CSV with one row per variant. Valid rows import while
            failed rows are returned with reasons.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Required columns</AlertTitle>
            <AlertDescription>
              productName, variantName, sku, unitOfMeasure, costPrice, and
              sellingPrice are required. Duplicate SKUs in the file are
              rejected.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={templateMutation.isPending}
              onClick={() => templateMutation.mutate()}
              type="button"
              variant="outline"
            >
              {templateMutation.isPending ? (
                <Spinner />
              ) : (
                <Download data-icon="inline-start" />
              )}
              Download template
            </Button>
          </div>

          <Input
            accept=".csv,text/csv"
            aria-label="Catalog import CSV"
            key={fileInputKey}
            onChange={(event) => {
              setUploadResult(null);
              setInvalidatedJobReference(null);
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              reportMutation.reset();
              importMutation.reset();
            }}
            type="file"
          />

          {templateMutation.isError ? (
            <AppErrorBanner
              error={templateMutation.error}
              title="Unable to download template"
            />
          ) : null}
          {importMutation.isError ? (
            <AppErrorBanner
              error={importMutation.error}
              title="Unable to import catalogue"
            />
          ) : null}
          {reportMutation.isError ? (
            <AppErrorBanner
              error={reportMutation.error}
              title="Unable to download failed-row report"
            />
          ) : null}

          {uploadResult ? (
            <CatalogImportResult
              job={job}
              jobError={jobQuery.error}
              jobPending={jobQuery.isPending}
              onReport={() => reportMutation.mutate(uploadResult.jobReference)}
              pendingReport={reportMutation.isPending}
              result={uploadResult}
            />
          ) : null}
        </div>

        <DialogFooter showCloseButton>
          <Button
            disabled={!canStartImport}
            onClick={() => selectedFile && importMutation.mutate(selectedFile)}
            type="button"
          >
            {importMutation.isPending ? (
              <Spinner />
            ) : (
              <FileUp data-icon="inline-start" />
            )}
            Start import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeContentType(
  file: File,
): "text/csv" | "application/vnd.ms-excel" {
  return file.type === "application/vnd.ms-excel"
    ? "application/vnd.ms-excel"
    : "text/csv";
}

function downloadTextFile(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
