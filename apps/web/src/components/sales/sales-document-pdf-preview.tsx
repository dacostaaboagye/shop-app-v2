"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div>
          <p className="text-base font-semibold">Official PDF</p>
          <p className="text-sm text-muted-foreground">
            Previewing the same issued file used for download and sharing.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {fileQuery.isPending || !objectUrl ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <iframe
            className="h-[520px] w-full rounded-md border border-border bg-background"
            src={objectUrl}
            title={`Official PDF ${reference}`}
          />
        )}
      </CardContent>
    </Card>
  );
}
