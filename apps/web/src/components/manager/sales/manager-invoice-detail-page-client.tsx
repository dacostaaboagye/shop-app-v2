"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { PrintableInvoice } from "@/components/sales/printable-invoice";
import { SalesDocumentActions } from "@/components/sales/sales-document-actions";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import { fetchManagerInvoice, invoiceQueryKey } from "@/lib/react-query/pos-sales";
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
        description="Official invoice details, line items, and document actions."
        title={reference}
      />

      {invoiceQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : invoiceQuery.isError ? (
        <AppErrorBanner
          detail="Could not load this invoice."
          error={invoiceQuery.error}
          onRetry={() => void invoiceQuery.refetch()}
          title="Unable to load invoice"
        />
      ) : invoiceQuery.data ? (
        <ManagerInvoiceView invoice={invoiceQuery.data} />
      ) : null}
    </PageShell>
  );
}

function ManagerInvoiceView({ invoice }: { invoice: PrintableInvoiceData }) {
  const printRef = useRef<HTMLDivElement>(null);
  const profileQuery = useQuery({
    queryFn: () => fetchOfficialDocumentProfile(invoice.locationId),
    queryKey: officialDocumentProfileQueryKey(invoice.locationId),
    staleTime: 60_000,
  });
  const profile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice.reference,
    pageStyle: `
      @page { size: 80mm auto; margin: 6mm; }
      body { font-family: 'Source Sans 3', 'Segoe UI', sans-serif; font-size: 11px; color: black; background: white; }
    `,
  });
  const isReturn = invoice.type === "credit_note";
  const paymentLabel = formatPaymentMethod(invoice.paymentMethod);
  const date = new Date(invoice.confirmedAt ?? invoice.createdAt);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {profileQuery.isError ? (
        <AppErrorBanner
          detail="Using fallback document branding until settings can be loaded."
          error={profileQuery.error}
          onRetry={() => void profileQuery.refetch()}
          title="Document profile unavailable"
        />
      ) : null}
      <SalesDocumentActions
        invoice={invoice}
        onPrint={handlePrint}
        profile={profile}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-lg font-semibold">{invoice.reference}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {date.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={isReturn ? "destructive" : "secondary"}>
                {isReturn ? "Return" : "POS Sale"}
              </Badge>
              <Badge variant={invoice.status === "voided" ? "destructive" : "outline"}>
                {invoice.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <SummaryItem label="Payment" value={paymentLabel} />
          <SummaryItem label="Subtotal" value={invoice.subtotalAmount} mono />
          <SummaryItem label="Total" value={invoice.totalAmount} prominent />
          {invoice.attributedWorkerId ? (
            <div className="col-span-full">
              <p className="text-xs text-muted-foreground">Attributed worker</p>
              {invoice.attributedWorkerName ? (
                <p className="font-medium">{invoice.attributedWorkerName}</p>
              ) : null}
              {invoice.attributedWorkerEmail ? (
                <p className="text-sm text-muted-foreground">
                  {invoice.attributedWorkerEmail}
                </p>
              ) : null}
              {!invoice.attributedWorkerName && !invoice.attributedWorkerEmail ? (
                <p className="font-mono text-xs">{invoice.attributedWorkerId}</p>
              ) : null}
            </div>
          ) : null}
          {invoice.notes ? (
            <div className="col-span-full">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p>{invoice.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <InvoiceLineItems invoice={invoice} />

      <div aria-hidden className="fixed left-[-9999px] top-0">
        <PrintableInvoice ref={printRef} invoice={invoice} profile={profile} />
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  mono,
  prominent,
  value,
}: {
  label: string;
  mono?: boolean;
  prominent?: boolean;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          prominent
            ? "text-base font-bold tabular-nums"
            : mono
              ? "font-medium tabular-nums"
              : "font-medium"
        }
      >
        {value}
      </p>
    </div>
  );
}

function InvoiceLineItems({ invoice }: { invoice: PrintableInvoiceData }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="text-base font-semibold">Line items</p>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="divide-y divide-border">
          {invoice.lines.map((line) => (
            <div key={line.skuId} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{line.skuSnapshot.productName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.skuSnapshot.variantName} &middot; {line.skuSnapshot.sku}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {line.unitPrice} &times; {line.quantity}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{line.lineTotal}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
          <span className="text-sm font-medium">Total</span>
          <span className="font-bold tabular-nums">{invoice.totalAmount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPaymentMethod(value: string | null): string {
  if (value === "mobile_money") return "Mobile money";
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
