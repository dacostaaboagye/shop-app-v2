"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import {
  SalesDocumentWorkspace,
  SalesDocumentWorkspaceSkeleton,
} from "@/components/sales/sales-document-workspace";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatPublicReference } from "@/lib/display/format";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  fetchWorkerInvoice,
  invoiceQueryKey,
} from "@/lib/react-query/pos-sales";
import { toRoute } from "@/lib/routes";
import { PosSaleReturnDialog } from "./pos-sale-return-dialog";

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
  const profileQuery = useQuery({
    enabled: Boolean(invoiceQuery.data?.locationId),
    queryFn: () => fetchOfficialDocumentProfile(invoiceQuery.data?.locationId),
    queryKey: officialDocumentProfileQueryKey(invoiceQuery.data?.locationId),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/worker/sales/history")}
        backLabel="Sales history"
        description="View the official PDF and sale details."
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
          invoice={invoiceQuery.data}
          secondaryAction={
            <>
              <PosSaleReturnDialog
                invoice={invoiceQuery.data}
                moneyProfile={moneyProfile}
              />
              <NewSaleLink />
            </>
          }
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
