"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Share2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { PrintableInvoice } from "@/components/sales/printable-invoice";
import type { PrintableInvoiceData } from "@/components/sales/printable-invoice";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
        description="Invoice details and line items."
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice.reference,
    pageStyle: `
      @page { size: 80mm auto; margin: 6mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; }
    `,
  });

  function handleShare() {
    const date = invoice.confirmedAt
      ? new Date(invoice.confirmedAt).toLocaleString()
      : new Date(invoice.createdAt).toLocaleString();
    const itemsText = invoice.lines
      .map(
        (l) =>
          `  ${l.skuSnapshot.productName} (${l.skuSnapshot.variantName}) × ${l.quantity} = ${l.lineTotal}`,
      )
      .join("\n");
    const text = `Invoice: ${invoice.reference}\nDate: ${date}\n\nItems:\n${itemsText}\n\nTotal: ${invoice.totalAmount}${invoice.notes ? `\nNotes: ${invoice.notes}` : ""}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: `Invoice ${invoice.reference}`, text });
    } else {
      void navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Invoice details copied to clipboard"));
    }
  }

  const isReturn = invoice.type === "credit_note";
  const paymentLabel =
    invoice.paymentMethod === "mobile_money"
      ? "Mobile money"
      : invoice.paymentMethod
        ? invoice.paymentMethod.charAt(0).toUpperCase() +
          invoice.paymentMethod.slice(1).replace(/_/g, " ")
        : "—";

  const date = invoice.confirmedAt
    ? new Date(invoice.confirmedAt)
    : new Date(invoice.createdAt);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePrint} size="sm" variant="outline">
          <Printer className="mr-1.5 size-3.5" />
          Print receipt
        </Button>
        <Button onClick={handleShare} size="sm" variant="outline">
          <Share2 className="mr-1.5 size-3.5" />
          Share
        </Button>
      </div>

      {/* Invoice summary */}
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
              <Badge
                variant={invoice.status === "voided" ? "destructive" : "outline"}
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Payment</p>
            <p className="font-medium">{paymentLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium tabular-nums">{invoice.subtotalAmount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-base font-bold tabular-nums">{invoice.totalAmount}</p>
          </div>
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

      {/* Line items */}
      <Card>
        <CardHeader className="pb-0">
          <p className="text-base font-semibold">Line items</p>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <div className="divide-y divide-border">
            {invoice.lines.map((line) => (
              <div
                key={line.skuId}
                className="flex items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {line.skuSnapshot.productName}
                  </p>
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

      {/* Hidden printable receipt */}
      <div aria-hidden className="fixed left-[-9999px] top-0">
        <PrintableInvoice ref={printRef} invoice={invoice} />
      </div>
    </div>
  );
}
