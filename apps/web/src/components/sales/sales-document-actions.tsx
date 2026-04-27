"use client";

import { Download, Mail, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OfficialDocumentProfile } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import {
  downloadDocumentFile,
  downloadSalesDocument,
  getSalesDocumentTitle,
  shareDocumentFile,
  shareSalesDocument,
} from "@/lib/documents/sales-document";
import { sendSalesDocumentEmail } from "@/lib/react-query/official-documents";

type Props = {
  disabled?: boolean;
  getDocumentFile?: () => Promise<File>;
  invoice: PrintableInvoiceData;
  onPrint: () => void;
  profile: OfficialDocumentProfile;
};

export function SalesDocumentActions({
  disabled = false,
  getDocumentFile,
  invoice,
  onPrint,
  profile,
}: Props) {
  const [isFilePending, setIsFilePending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const documentTitle = getSalesDocumentTitle(invoice).toLowerCase();
  const actionsDisabled = disabled || isFilePending || isEmailPending;

  async function handleShare() {
    try {
      setIsFilePending(true);
      const result = getDocumentFile
        ? await shareDocumentFile(
            await getDocumentFile(),
            `${getSalesDocumentTitle(invoice)} ${invoice.reference}`,
          )
        : await shareSalesDocument(invoice, profile);
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
    } finally {
      setIsFilePending(false);
    }
  }

  async function handleDownload() {
    try {
      setIsFilePending(true);
      const downloaded = getDocumentFile
        ? downloadDocumentFile(await getDocumentFile())
        : downloadSalesDocument(invoice, profile);
      if (downloaded) {
        toast.success("Document downloaded.");
        return;
      }
      toast.error("Unable to download this document.");
    } catch {
      toast.error("Unable to download this document.");
    } finally {
      setIsFilePending(false);
    }
  }

  async function handleEmail() {
    try {
      setIsEmailPending(true);
      const result = await sendSalesDocumentEmail(invoice.reference);
      toast.success(`Document emailed to ${result.recipientEmail}.`);
    } catch {
      toast.error("Unable to email this document.");
    } finally {
      setIsEmailPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={actionsDisabled}
        onClick={onPrint}
        size="sm"
        variant="outline"
      >
        <Printer data-icon="inline-start" />
        Print
      </Button>
      <Button
        disabled={actionsDisabled}
        onClick={() => void handleDownload()}
        size="sm"
        variant="outline"
      >
        <Download data-icon="inline-start" />
        {isFilePending ? "Preparing..." : "Download"}
      </Button>
      <Button
        disabled={actionsDisabled}
        onClick={() => void handleShare()}
        size="sm"
        variant="outline"
      >
        <Share2 data-icon="inline-start" />
        Share {documentTitle}
      </Button>
      {invoice.customerEmail ? (
        <Button
          disabled={actionsDisabled}
          onClick={() => void handleEmail()}
          size="sm"
          variant="outline"
        >
          <Mail data-icon="inline-start" />
          {isEmailPending ? "Sending..." : `Email ${documentTitle}`}
        </Button>
      ) : null}
    </div>
  );
}
