"use client";

import { Download, FileText, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  downloadDocumentFile,
  shareDocumentFile,
} from "@/lib/documents/document-file-actions";
import { fetchGtnDocumentDownloadFile } from "@/lib/react-query/official-documents";

type GtnDocumentAction = "download" | "share" | "view";

export function GtnDocumentActions({ reference }: { reference: string }) {
  const [pendingAction, setPendingAction] = useState<GtnDocumentAction | null>(
    null,
  );
  const disabled = pendingAction != null;

  async function getFile() {
    return fetchGtnDocumentDownloadFile(reference);
  }

  async function handleView() {
    try {
      setPendingAction("view");
      const file = await getFile();
      const url = URL.createObjectURL(file);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (!opened) toast.error("Allow pop-ups to view the GTN PDF.");
    } catch {
      toast.error("Unable to open this GTN PDF.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDownload() {
    try {
      setPendingAction("download");
      if (downloadDocumentFile(await getFile())) {
        toast.success("GTN PDF downloaded.");
        return;
      }
      toast.error("Unable to download this GTN PDF.");
    } catch {
      toast.error("Unable to download this GTN PDF.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleShare() {
    try {
      setPendingAction("share");
      const result = await shareDocumentFile(
        await getFile(),
        `Goods transfer note ${reference}`,
      );
      if (result === "shared") {
        toast.success("GTN PDF shared.");
        return;
      }
      if (result === "downloaded") {
        toast.success("GTN PDF downloaded. Share the file from your device.");
        return;
      }
      toast.error("This browser cannot share or download the GTN PDF.");
    } catch {
      toast.error("Unable to share this GTN PDF.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={disabled}
        onClick={() => void handleView()}
        size="sm"
        variant="outline"
      >
        <FileText data-icon="inline-start" />
        View GTN PDF
      </Button>
      <Button
        disabled={disabled}
        onClick={() => void handleDownload()}
        size="sm"
        variant="outline"
      >
        <Download data-icon="inline-start" />
        Download
      </Button>
      <Button
        disabled={disabled}
        onClick={() => void handleShare()}
        size="sm"
        variant="outline"
      >
        <Share2 data-icon="inline-start" />
        Share
      </Button>
    </div>
  );
}
