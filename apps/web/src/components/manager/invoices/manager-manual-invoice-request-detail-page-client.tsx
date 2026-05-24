"use client";

import { useQuery } from "@tanstack/react-query";
import { ManualInvoiceRequestDetail } from "@/components/invoices/manual-invoice-request-detail";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPublicReference } from "@/lib/display/format";
import {
  fetchManualInvoiceRequest,
  manualInvoiceRequestQueryKey,
} from "@/lib/react-query/manual-invoices";
import { toRoute } from "@/lib/routes";

export function ManagerManualInvoiceRequestDetailPageClient({
  reference,
}: {
  reference: string;
}) {
  const requestQuery = useQuery({
    queryFn: () => fetchManualInvoiceRequest("manager", reference),
    queryKey: manualInvoiceRequestQueryKey("manager", reference),
    staleTime: 30_000,
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/manager/invoices/manual-requests")}
        backLabel="Manual requests"
        description="Review the request status, line evidence, and approval outcome."
        title={formatPublicReference(reference)}
      />

      {requestQuery.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : requestQuery.isError ? (
        <AppErrorBanner
          detail="Could not load this manual invoice request."
          error={requestQuery.error}
          onRetry={() => void requestQuery.refetch()}
          title="Unable to load request"
        />
      ) : requestQuery.data ? (
        <ManualInvoiceRequestDetail request={requestQuery.data} />
      ) : null}
    </PageShell>
  );
}
