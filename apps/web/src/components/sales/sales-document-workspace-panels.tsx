"use client";
import type { ReactNode } from "react";
import { SalesDocumentActions } from "@/components/sales/sales-document-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { OfficialDocumentProfile } from "@/lib/documents/official-document-profile";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";
import { formatMoney } from "@/lib/money/format-money";
import { fetchSalesDocumentDownloadFile } from "@/lib/react-query/official-documents";

export function OfficialDocumentPanel({
  actionsDisabled,
  invoice,
  onPrint,
  profile,
  secondaryAction,
  snapshotHash,
}: {
  actionsDisabled: boolean;
  invoice: PrintableInvoiceData;
  onPrint: () => void;
  profile: OfficialDocumentProfile;
  secondaryAction?: ReactNode;
  snapshotHash: string | null;
}) {
  const isReturn = invoice.type === "credit_note";

  return (
    <Card className="hero-panel border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Official document
            </p>
            <h2 className="mt-1 font-mono text-2xl font-semibold">
              {invoice.reference}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(
                invoice.confirmedAt ?? invoice.createdAt,
              ).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isReturn ? "destructive" : "secondary"}>
              {isReturn ? "Credit note" : "Sales receipt"}
            </Badge>
            <Badge
              variant={invoice.status === "voided" ? "destructive" : "outline"}
            >
              {invoice.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {snapshotHash ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
            Snapshot evidence: {snapshotHash}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <SalesDocumentActions
            disabled={actionsDisabled}
            getDocumentFile={() =>
              fetchSalesDocumentDownloadFile(invoice.reference)
            }
            invoice={invoice}
            onPrint={onPrint}
            profile={profile}
          />
          {secondaryAction}
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesSummary({
  invoice,
  profile,
  showWorkerAttribution,
}: {
  invoice: PrintableInvoiceData;
  profile: OfficialDocumentProfile;
  showWorkerAttribution: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <p className="text-base font-semibold">Sale details</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm sm:grid-cols-3">
        <SummaryItem
          label="Payment"
          value={formatPaymentMethod(invoice.paymentMethod)}
        />
        <SummaryItem
          label="Subtotal"
          value={formatMoney(invoice.subtotalAmount, profile)}
          mono
        />
        <SummaryItem
          label="Total"
          value={formatMoney(invoice.totalAmount, profile)}
          prominent
        />
        {showWorkerAttribution && invoice.attributedWorkerId ? (
          <WorkerAttribution invoice={invoice} />
        ) : null}
        {invoice.notes ? (
          <div className="col-span-full">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function InvoiceLineItems({
  invoice,
  profile,
}: {
  invoice: PrintableInvoiceData;
  profile: OfficialDocumentProfile;
}) {
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
                <p className="truncate font-medium">
                  {line.skuSnapshot.productName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.skuSnapshot.variantName} &middot; {line.skuSnapshot.sku}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatMoney(line.unitPrice, profile)} &times; {line.quantity}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">
                {formatMoney(line.lineTotal, profile)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
          <span className="text-sm font-medium">Total</span>
          <span className="font-bold tabular-nums">
            {formatMoney(invoice.totalAmount, profile)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerAttribution({ invoice }: { invoice: PrintableInvoiceData }) {
  return (
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
      <p className={summaryValueClassName({ mono, prominent })}>{value}</p>
    </div>
  );
}

function summaryValueClassName(input: {
  mono: boolean | undefined;
  prominent: boolean | undefined;
}) {
  if (input.prominent) return "text-base font-bold tabular-nums";
  if (input.mono) return "font-medium tabular-nums";
  return "font-medium";
}

function formatPaymentMethod(value: string | null): string {
  if (value === "mobile_money") return "Mobile money";
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
