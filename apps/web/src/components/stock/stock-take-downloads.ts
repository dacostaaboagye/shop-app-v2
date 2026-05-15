"use client";

import { useMutation } from "@tanstack/react-query";
import {
  downloadStockTakeBookletPdf,
  downloadStockTakeSheetCsv,
  downloadStockTakeSheetXlsx,
  type StockTakePortal,
} from "@/lib/react-query/stock-takes";

export function useStockTakeDownloads(portal: StockTakePortal) {
  const workbookMutation = useMutation({
    mutationFn: (reference: string) =>
      downloadStockTakeSheetXlsx(portal, reference),
    onSuccess: saveDownloadedFile,
  });
  const csvMutation = useMutation({
    mutationFn: (reference: string) =>
      downloadStockTakeSheetCsv(portal, reference),
    onSuccess: saveDownloadedFile,
  });
  const pdfMutation = useMutation({
    mutationFn: (reference: string) =>
      downloadStockTakeBookletPdf(portal, reference),
    onSuccess: saveDownloadedFile,
  });

  return { csvMutation, pdfMutation, workbookMutation };
}

export function saveDownloadedFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}
