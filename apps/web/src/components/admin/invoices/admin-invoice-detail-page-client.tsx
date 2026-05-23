"use client";

import { useQuery } from "@tanstack/react-query";
import {
  SalesDocumentWorkspace,
  SalesDocumentWorkspaceSkeleton,
} from "@/components/sales/sales-document-workspace";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { formatPublicReference } from "@/lib/display/format";
import {
  fetchAdminInvoice,
  invoiceQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";

export function AdminInvoiceDetailPageClient({
  reference,
}: {
  reference: string;
}) {
  const invoiceQuery = useQuery({
    queryFn: () => fetchAdminInvoice(reference),
    queryKey: [invoiceQueryKey(reference), "admin"],
    staleTime: 60_000,
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/sales")}
        backLabel="Sales ledger"
        description="Review the official document snapshot, PDF, and invoice actions."
        title={formatPublicReference(reference)}
      />

      {invoiceQuery.isPending ? (
        <SalesDocumentWorkspaceSkeleton />
      ) : invoiceQuery.isError ? (
        <AppErrorBanner
          detail="Could not load this invoice."
          error={invoiceQuery.error}
          onRetry={() => void invoiceQuery.refetch()}
          title="Unable to load invoice"
        />
      ) : invoiceQuery.data ? (
        <SalesDocumentWorkspace
          detailBasePath="/admin/sales"
          invoice={invoiceQuery.data}
          showWorkerAttribution
        />
      ) : null}
    </PageShell>
  );
}
