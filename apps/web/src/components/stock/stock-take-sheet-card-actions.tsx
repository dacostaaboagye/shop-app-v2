"use client";

import { FileDown, FileSearch, Printer } from "lucide-react";
import Link from "next/link";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  StockTakeMode,
  StockTakeSheetResponse,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

type GeneratedSheetActionsProps = {
  csvError: unknown;
  isCsvPending: boolean;
  isPdfPending: boolean;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  pdfError: unknown;
  sheet: StockTakeSheetResponse;
};

export function GeneratedSheetActions({
  csvError,
  isCsvPending,
  isPdfPending,
  onDownloadCsv,
  onDownloadPdf,
  pdfError,
  sheet,
}: GeneratedSheetActionsProps) {
  return (
    <>
      {csvError ? (
        <AppErrorBanner
          detail="The sheet was generated, but the CSV download failed. You can retry the download or open the printable booklet."
          error={csvError}
          title="Unable to download CSV"
        />
      ) : null}
      {pdfError ? (
        <AppErrorBanner
          detail="The sheet was generated, but the PDF download failed. Open the printable booklet and retry from there."
          error={pdfError}
          title="Unable to download PDF"
        />
      ) : null}
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {sheet.stockTakeReference} generated for {sheet.locationName}
          </p>
          <p className="type-support mt-1 text-muted-foreground">
            {sheet.lineCount} line(s) - {formatMode(sheet.mode)} -{" "}
            {formatDateTime(sheet.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isCsvPending}
            onClick={onDownloadCsv}
            type="button"
            variant="outline"
          >
            {isCsvPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FileDown data-icon="inline-start" />
            )}
            CSV
          </Button>
          <Button
            disabled={isPdfPending}
            onClick={onDownloadPdf}
            type="button"
            variant="outline"
          >
            {isPdfPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FileDown data-icon="inline-start" />
            )}
            PDF
          </Button>
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            href={toRoute(getReviewUrl(sheet))}
          >
            <FileSearch data-icon="inline-start" />
            Review import
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href={toRoute(sheet.printableBookletUrl)}
          >
            <Printer data-icon="inline-start" />
            Print booklet
          </Link>
        </div>
      </div>
    </>
  );
}

function getReviewUrl(sheet: StockTakeSheetResponse) {
  return sheet.printableBookletUrl.replace(/\/booklet$/, "");
}

export function saveDownloadedFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

function formatMode(mode: StockTakeMode) {
  return mode === "blind" ? "Blind count" : "Assisted count";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
