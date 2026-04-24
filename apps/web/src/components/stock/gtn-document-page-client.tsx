"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  downloadDocumentFile,
  shareDocumentFile,
} from "@/lib/documents/document-file-actions";
import {
  fetchGtnDocumentDownloadFile,
  gtnDocumentDownloadFileQueryKey,
} from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";

type Portal = "manager" | "worker";
type Action = "download" | "share";

type Props = {
  portal: Portal;
  reference: string;
};

export function GtnDocumentPageClient({ portal, reference }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const fileQuery = useQuery({
    queryFn: () => fetchGtnDocumentDownloadFile(reference),
    queryKey: gtnDocumentDownloadFileQueryKey(reference),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const file = fileQuery.data ?? null;

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleDownload() {
    if (!file) return;

    try {
      setPendingAction("download");
      if (downloadDocumentFile(file)) {
        toast.success("GTN PDF downloaded.");
        return;
      }
      toast.error("Unable to download this GTN PDF.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleShare() {
    if (!file) return;

    try {
      setPendingAction("share");
      const result = await shareDocumentFile(
        file,
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
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <PageShell>
      <PageHeader
        actions={
          <DocumentActions
            disabled={!file || fileQuery.isError}
            onDownload={() => void handleDownload()}
            onShare={() => void handleShare()}
            pendingAction={pendingAction}
          />
        }
        backHref={getBackHref(portal)}
        backLabel="Supply requests"
        description="Issued goods transfer note for the stock request transaction."
        eyebrow="Goods transfer note"
        title={reference}
      />

      {fileQuery.isError ? (
        <AppErrorBanner
          detail="The official GTN PDF could not be loaded."
          error={fileQuery.error}
          onRetry={() => void fileQuery.refetch()}
          title="PDF preview unavailable"
        />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-foreground px-4 py-3 text-background">
            <div>
              <p className="text-sm font-semibold">Official PDF</p>
              <p className="text-xs text-background/70">
                Previewing the issued file used for download and sharing.
              </p>
            </div>
            <p className="font-mono text-xs text-background/80">{reference}</p>
          </div>
          <div className="bg-muted/45 p-4 sm:p-6">
            {fileQuery.isPending || !objectUrl ? (
              <Skeleton className="h-[calc(100svh-18rem)] min-h-[520px] w-full" />
            ) : (
              <iframe
                className="h-[calc(100svh-18rem)] min-h-[520px] w-full rounded-md border border-border bg-background"
                src={objectUrl}
                title={`Goods transfer note ${reference}`}
              />
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function DocumentActions({
  disabled,
  onDownload,
  onShare,
  pendingAction,
}: {
  disabled: boolean;
  onDownload: () => void;
  onShare: () => void;
  pendingAction: Action | null;
}) {
  return (
    <>
      <Button
        disabled={disabled || pendingAction != null}
        onClick={onDownload}
        size="sm"
        variant="outline"
      >
        <Download data-icon="inline-start" />
        {pendingAction === "download" ? "Downloading..." : "Download"}
      </Button>
      <Button
        disabled={disabled || pendingAction != null}
        onClick={onShare}
        size="sm"
        variant="outline"
      >
        <Share2 data-icon="inline-start" />
        {pendingAction === "share" ? "Sharing..." : "Share"}
      </Button>
    </>
  );
}

function getBackHref(portal: Portal): Route {
  return toRoute(`/${portal}/stock/supply-requests`);
}
