"use client";

import { Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadSalesDocument,
  getSalesDocumentTitle,
  shareSalesDocument,
} from "@/lib/documents/sales-document";
import type { OfficialDocumentProfile } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";

type Props = {
  invoice: PrintableInvoiceData;
  onPrint: () => void;
  profile: OfficialDocumentProfile;
};

export function SalesDocumentActions({ invoice, onPrint, profile }: Props) {
  const documentTitle = getSalesDocumentTitle(invoice).toLowerCase();

  async function handleShare() {
    try {
      const result = await shareSalesDocument(invoice, profile);
      if (result === "shared") {
        toast.success("Document shared.");
        return;
      }
      if (result === "downloaded") {
        toast.success("Document downloaded. Share the file from your device.");
        return;
      }
      toast.error("This browser cannot share or download the document.");
    } catch {
      toast.error("Unable to share this document.");
    }
  }

  function handleDownload() {
    if (downloadSalesDocument(invoice, profile)) {
      toast.success("Document downloaded.");
      return;
    }
    toast.error("Unable to download this document.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onPrint} size="sm" variant="outline">
        <Printer data-icon="inline-start" />
        Print
      </Button>
      <Button onClick={handleDownload} size="sm" variant="outline">
        <Download data-icon="inline-start" />
        Download
      </Button>
      <Button onClick={handleShare} size="sm" variant="outline">
        <Share2 data-icon="inline-start" />
        Share {documentTitle}
      </Button>
    </div>
  );
}
