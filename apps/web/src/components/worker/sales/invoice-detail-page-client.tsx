"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { SalesDocumentWorkspace } from "@/components/sales/sales-document-workspace";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchWorkerInvoice,
  invoiceQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";

export function WorkerInvoiceDetailPageClient({
  reference,
}: {
  reference: string;
}) {
  const invoiceQuery = useQuery({
    queryFn: () => fetchWorkerInvoice(reference),
    queryKey: invoiceQueryKey(reference),
    staleTime: 60_000,
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/worker/sales/history")}
        backLabel="Sales history"
        description="View the official PDF, receipt evidence, and sale details."
        title={reference}
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
          secondaryAction={<NewSaleLink />}
        />
      ) : null}
    </PageShell>
  );
}

function NewSaleLink() {
  return (
    <Link
      className={buttonVariants({ size: "sm" })}
      href={toRoute("/worker/sales")}
    >
      <ShoppingCart data-icon="inline-start" />
      New sale
    </Link>
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
