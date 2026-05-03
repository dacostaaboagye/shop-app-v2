"use client";

import { Download, FileText, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  downloadDocumentFile,
  shareDocumentFile,
} from "@/lib/documents/document-file-actions";
import { fetchGtnDocumentDownloadFile } from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getGtnDocumentHref } from "./gtn-document-actions.support";

type GtnDocumentAction = "download" | "share";

export function GtnDocumentActions({ reference }: { reference: string }) {
  const [pendingAction, setPendingAction] = useState<GtnDocumentAction | null>(
    null,
  );
  const pathname = usePathname();
  const disabled = pendingAction != null;
  const viewHref = toRoute(getGtnDocumentHref({ pathname, reference }));

  async function getFile() {
    return fetchGtnDocumentDownloadFile(reference);
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
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          disabled && "pointer-events-none opacity-50",
        )}
        href={viewHref}
      >
        <FileText data-icon="inline-start" />
        View GTN PDF
      </Link>
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
