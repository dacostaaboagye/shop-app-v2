"use client";

import type {
  CatalogReferenceImportEntity,
  CatalogReferenceImportResponse,
} from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { useState } from "react";
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
  adminCatalogReferenceImportListQueryKey,
  fetchCatalogReferenceImportTemplate,
  startCatalogReferenceImport,
} from "@/lib/react-query/admin-catalog-reference-import";
import { normalizeCsvContentType } from "./reference-import-dialog.support";
import { ReferenceImportResult } from "./reference-import-result";

type ReferenceImportDialogProps = {
  entity: CatalogReferenceImportEntity;
};

const entityCopy = {
  brand: {
    columns: "name is required. description, website, and status are optional.",
    fileName: "brand-import-template.csv",
    label: "brands",
    title: "Import brands",
  },
  category: {
    columns:
      "name is required. description, parentCategorySlug, and status are optional.",
    fileName: "category-import-template.csv",
    label: "categories",
    title: "Import categories",
  },
} satisfies Record<CatalogReferenceImportEntity, Record<string, string>>;

export function ReferenceImportDialog({ entity }: ReferenceImportDialogProps) {
  const copy = entityCopy[entity];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<CatalogReferenceImportResponse | null>(
    null,
  );
  const [fileInputKey, setFileInputKey] = useState(0);
  const templateMutation = useMutation({
    mutationFn: () => fetchCatalogReferenceImportTemplate(entity),
    onSuccess: (template) => downloadTextFile(copy.fileName, template.csv),
  });
  const importMutation = useMutation({
    mutationFn: async (file: File) =>
      startCatalogReferenceImport(entity, {
        contentType: normalizeCsvContentType(file),
        csv: await file.text(),
        fileName: file.name,
      }),
    onSuccess: (nextResult) => {
      setResult(nextResult);
      void queryClient.invalidateQueries({
        queryKey: adminCatalogReferenceImportListQueryKey(entity),
      });
    },
  });

  const resetDialogState = () => {
    setSelectedFile(null);
    setResult(null);
    setFileInputKey((current) => current + 1);
    templateMutation.reset();
    importMutation.reset();
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
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Upload a CSV to create {copy.label}. Valid rows import while failed
            rows are returned with reasons.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Alert>
            <AlertTitle>Required columns</AlertTitle>
            <AlertDescription>{copy.columns}</AlertDescription>
          </Alert>

          <Button
            className="w-fit"
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

          <Input
            accept=".csv,text/csv,application/vnd.ms-excel"
            aria-label={`${copy.label} import CSV`}
            key={fileInputKey}
            onChange={(event) => {
              setResult(null);
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
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
              title={`Unable to import ${copy.label}`}
            />
          ) : null}
          {result ? (
            <ReferenceImportResult
              onDownload={downloadTextFile}
              result={result}
            />
          ) : null}
        </div>

        <DialogFooter showCloseButton>
          <Button
            disabled={selectedFile === null || importMutation.isPending}
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

function downloadTextFile(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
