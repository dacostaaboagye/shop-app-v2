"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchSalesDocumentDownloadFile,
  salesDocumentDownloadFileQueryKey,
} from "@/lib/react-query/official-documents";

type Props = {
  enabled?: boolean;
  reference: string;
};

export function SalesDocumentPdfPreview({ enabled = true, reference }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileQuery = useQuery({
    enabled,
    queryFn: () => fetchSalesDocumentDownloadFile(reference),
    queryKey: salesDocumentDownloadFileQueryKey(reference),
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    const file = fileQuery.data ?? null;
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [fileQuery.data]);

  if (!enabled) return null;

  if (fileQuery.isError) {
    return (
      <AppErrorBanner
        detail="The official PDF preview could not be loaded."
        error={fileQuery.error}
        onRetry={() => void fileQuery.refetch()}
        title="PDF preview unavailable"
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-foreground px-4 py-3 text-background">
        <div>
          <p className="text-sm font-semibold">Official PDF</p>
          <p className="text-xs text-background/70">
            Previewing the same issued file used for download and sharing.
          </p>
        </div>
        <p className="font-mono text-xs text-background/80">{reference}</p>
      </div>
      <div className="bg-muted/45 p-4 sm:p-6">
        {fileQuery.isPending || !objectUrl ? (
          <Skeleton className="h-[calc(100svh-15rem)] min-h-[720px] w-full" />
        ) : (
          <iframe
            className="h-[calc(100svh-15rem)] min-h-[720px] w-full rounded-md border border-border bg-background"
            src={objectUrl}
            title={`Official PDF ${reference}`}
          />
        )}
      </div>
    </section>
  );
}
