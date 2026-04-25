"use client";

import { useQuery } from "@tanstack/react-query";
import { SalesDocumentWorkspace } from "@/components/sales/sales-document-workspace";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPublicReference } from "@/lib/display/format";
import {
  fetchManagerInvoice,
  invoiceQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";

export function ManagerInvoiceDetailPageClient({
  reference,
}: {
  reference: string;
}) {
  const invoiceQuery = useQuery({
    queryFn: () => fetchManagerInvoice(reference),
    queryKey: [invoiceQueryKey(reference), "manager"],
    staleTime: 60_000,
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/manager/sales")}
        backLabel="Sales"
        description="Review the sale record, official PDF, and document actions."
        title={formatPublicReference(reference)}
      />

      {invoiceQuery.isPending ? (
        <InvoiceDetailSkeleton />
      ) : invoiceQuery.isError ? (
        <AppErrorBanner
          detail="Could not load this invoice."
          error={invoiceQuery.error}
          onRetry={() => void invoiceQuery.refetch()}
          title="Unable to load invoice"
        />
      ) : invoiceQuery.data ? (
        <SalesDocumentWorkspace
          invoice={invoiceQuery.data}
          showWorkerAttribution
        />
      ) : null}
    </PageShell>
  );
}

function InvoiceDetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-[620px] w-full" />
    </div>
  );
}
