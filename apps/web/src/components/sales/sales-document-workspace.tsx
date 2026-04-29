"use client";

import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { PrintableInvoice } from "@/components/sales/printable-invoice";
import { DocumentErrors } from "@/components/sales/sales-document-errors";
import { SalesDocumentPdfPreview } from "@/components/sales/sales-document-pdf-preview";
import {
  InvoiceLineItems,
  OfficialDocumentPanel,
  RelatedDocumentsPanel,
  SalesSummary,
} from "@/components/sales/sales-document-workspace-panels";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import { toSalesDocumentSnapshot } from "@/lib/documents/sales-document-snapshot";
import {
  fetchSalesDocumentSnapshot,
  salesDocumentSnapshotQueryKey,
} from "@/lib/react-query/official-documents";

type Props = {
  detailBasePath: string;
  invoice: PrintableInvoiceData;
  secondaryAction?: ReactNode;
  showWorkerAttribution?: boolean;
};

export function SalesDocumentWorkspace({
  detailBasePath,
  invoice,
  secondaryAction,
  showWorkerAttribution = false,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const snapshotQuery = useQuery({
    queryFn: () => fetchSalesDocumentSnapshot(invoice.reference),
    queryKey: salesDocumentSnapshotQueryKey(invoice.reference),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const snapshot = snapshotQuery.data
    ? toSalesDocumentSnapshot(snapshotQuery.data)
    : null;
  const hasInvalidSnapshot = Boolean(snapshotQuery.data && !snapshot);
  const documentInvoice = snapshot?.payloadSnapshot ?? invoice;
  const profile =
    snapshot?.profileSnapshot ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  const documentActionsDisabled =
    snapshotQuery.isPending || snapshotQuery.isError || hasInvalidSnapshot;
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: documentInvoice.reference,
    pageStyle: `
      @page { size: 80mm auto; margin: 6mm; }
      body { font-family: 'Source Sans 3', 'Segoe UI', sans-serif; font-size: 11px; color: black; background: white; }
    `,
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
      <div className="flex flex-col gap-4">
        <DocumentErrors
          hasInvalidSnapshot={hasInvalidSnapshot}
          onRetry={() => void snapshotQuery.refetch()}
          snapshotError={snapshotQuery.error}
          snapshotIsError={snapshotQuery.isError}
        />
        <OfficialDocumentPanel
          detailBasePath={detailBasePath}
          actionsDisabled={documentActionsDisabled}
          invoice={documentInvoice}
          onPrint={handlePrint}
          profile={profile}
          secondaryAction={secondaryAction}
        />
        <RelatedDocumentsPanel
          detailBasePath={detailBasePath}
          invoice={documentInvoice}
        />
        <SalesSummary
          invoice={documentInvoice}
          profile={profile}
          showWorkerAttribution={showWorkerAttribution}
        />
        <InvoiceLineItems invoice={documentInvoice} profile={profile} />
      </div>

      <SalesDocumentPdfPreview
        enabled={!documentActionsDisabled}
        reference={documentInvoice.reference}
      />

      <div aria-hidden className="fixed left-[-9999px] top-0">
        <PrintableInvoice
          ref={printRef}
          invoice={documentInvoice}
          profile={profile}
        />
      </div>
    </div>
  );
}

export function SalesDocumentWorkspaceSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
      <Skeleton className="h-[760px] w-full" />
    </div>
  );
}
