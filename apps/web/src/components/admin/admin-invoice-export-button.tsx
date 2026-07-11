"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadDocumentFile } from "@/lib/documents/document-file-actions";
import {
  type AdminInvoiceListQuery,
  downloadAdminInvoicesCsv,
} from "@/lib/react-query/pos-sales";

type Props = {
  disabled?: boolean;
  query: AdminInvoiceListQuery;
};

export function AdminInvoiceExportButton({ disabled, query }: Props) {
  const exportMutation = useMutation({
    mutationFn: () => downloadAdminInvoicesCsv(query),
    onError() {
      toast.error("Unable to export invoices.");
    },
    onSuccess(file) {
      if (downloadDocumentFile(file)) {
        toast.success("Invoice CSV exported.");
        return;
      }
      toast.error("This browser could not download the export.");
    },
  });

  return (
    <Button
      disabled={disabled || exportMutation.isPending}
      onClick={() => exportMutation.mutate()}
      variant="outline"
    >
      <Download className="mr-2 size-4" />
      {exportMutation.isPending ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
