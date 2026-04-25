"use client";
import type { ReactNode } from "react";
import { SalesDocumentActions } from "@/components/sales/sales-document-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatDateTime,
  formatPublicReference,
  formatSupportText,
} from "@/lib/display/format";
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
}: {
  actionsDisabled: boolean;
  invoice: PrintableInvoiceData;
  onPrint: () => void;
  profile: OfficialDocumentProfile;
  secondaryAction?: ReactNode;
}) {
  const isReturn = invoice.type === "credit_note";
  const statusLabel = formatDocumentStatus(invoice.status);

  return (
    <Card className="hero-panel border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-kicker text-muted-foreground">
              Official document
            </p>
            <h2 className="type-section-title mt-1 text-foreground sm:text-3xl">
              {formatPublicReference(invoice.reference)}
            </h2>
            <p className="type-support mt-1">
              {formatDateTime(invoice.confirmedAt ?? invoice.createdAt, {
                locale: profile.locale,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isReturn ? "destructive" : "secondary"}>
              {isReturn ? "Credit note" : "Sales receipt"}
            </Badge>
            <Badge
              variant={invoice.status === "voided" ? "destructive" : "outline"}
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
        <p className="type-section-title text-xl text-foreground">
          Sale details
        </p>
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
            <p className="type-data-label">Notes</p>
            <p className="type-data-value">{invoice.notes}</p>
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
        <p className="type-section-title text-xl text-foreground">Line items</p>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="divide-y divide-border">
          {invoice.lines.map((line) => (
            <div
              key={line.skuId}
              className="flex items-start gap-3 px-5 py-3 sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="type-data-value text-balance">
                  {line.skuSnapshot.productName}
                </p>
                <p className="type-support text-pretty">
                  {line.skuSnapshot.variantName} | {line.skuSnapshot.sku}
                </p>
                <p className="type-support mt-0.5">
                  {formatMoney(line.unitPrice, profile)} x {line.quantity}
                </p>
              </div>
              <p className="type-inline-metric shrink-0 font-semibold">
                {formatMoney(line.lineTotal, profile)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
          <span className="type-data-value text-sm">Total</span>
          <span className="type-inline-metric font-bold">
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
      <p className="type-data-label">Attributed worker</p>
      {invoice.attributedWorkerName ? (
        <p className="type-data-value text-balance">
          {invoice.attributedWorkerName}
        </p>
      ) : null}
      {invoice.attributedWorkerEmail ? (
        <p className="type-support break-all">
          {invoice.attributedWorkerEmail}
        </p>
      ) : null}
      {!invoice.attributedWorkerName && !invoice.attributedWorkerEmail ? (
        <p className="type-support">
          {formatSupportText(null, "Worker attribution pending")}
        </p>
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
      <p className="type-data-label">{label}</p>
      <p className={summaryValueClassName({ mono, prominent })}>{value}</p>
    </div>
  );
}

function summaryValueClassName(input: {
  mono: boolean | undefined;
  prominent: boolean | undefined;
}) {
  if (input.prominent) return "type-inline-metric text-base font-bold";
  if (input.mono) return "type-inline-metric font-medium";
  return "type-data-value";
}

function formatPaymentMethod(value: string | null): string {
  if (value === "mobile_money") return "Mobile money";
  if (!value) return "Not recorded";
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function formatDocumentStatus(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
