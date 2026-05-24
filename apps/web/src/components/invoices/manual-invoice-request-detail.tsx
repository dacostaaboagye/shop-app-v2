"use client";

import type { ManualInvoiceRequestResponse } from "@shop/contracts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatPublicReference } from "@/lib/display/format";
import { formatMoney } from "@/lib/money/format-money";
import {
  getManualInvoiceMoneyProfile,
  getManualInvoiceStatusLabel,
  getManualInvoiceStatusVariant,
} from "./manual-invoice-request-support";

export function ManualInvoiceRequestDetail({
  request,
}: {
  request: ManualInvoiceRequestResponse;
}) {
  const moneyProfile = getManualInvoiceMoneyProfile(request);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryItem
          label="Request"
          value={formatPublicReference(request.reference)}
        />
        <SummaryItem label="Customer" value={request.customerName} />
        <div className="flex flex-col gap-1.5">
          <span className="type-data-label">Status</span>
          <Badge
            className="w-fit rounded-md"
            variant={getManualInvoiceStatusVariant(request.status)}
          >
            {getManualInvoiceStatusLabel(request.status)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryItem
          label="Location"
          value={request.locationName ?? "Location"}
        />
        <SummaryItem
          label="Requested by"
          value={request.requestedByName ?? "Unknown"}
        />
        <SummaryItem
          label="Created"
          value={formatDateTime(request.createdAt)}
        />
        <SummaryItem
          label="Payment method"
          value={formatPaymentMethod(request.paymentMethod)}
        />
      </div>

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Reason</h3>
        <p className="text-sm text-muted-foreground">{request.reason}</p>
        {request.supportingNote ? (
          <p className="text-sm text-muted-foreground">
            {request.supportingNote}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Lines</h3>
        <div className="rounded-lg border bg-card">
          {request.lines.map((line, index) => (
            <div
              className={[
                "grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_96px_120px_120px]",
                index !== request.lines.length - 1
                  ? "border-b border-border/60"
                  : "",
              ].join(" ")}
              key={line.skuId}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {line.skuSnapshot.productName}
                </p>
                <p className="type-support">{line.skuSnapshot.variantName}</p>
                <p className="type-identifier mt-1">{line.skuSnapshot.sku}</p>
              </div>
              <SummaryItem label="Qty" value={String(line.quantity)} />
              <SummaryItem
                label="Unit"
                value={formatMoney(line.unitPrice, moneyProfile)}
              />
              <SummaryItem
                label="Total"
                value={formatMoney(line.lineTotal, moneyProfile)}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
        <SummaryItem
          label="Subtotal"
          value={formatMoney(request.subtotalAmount, moneyProfile)}
        />
        <SummaryItem
          label="Tax"
          value={formatMoney(request.taxAmount, moneyProfile)}
        />
        <SummaryItem
          label="Total"
          value={formatMoney(request.totalAmount, moneyProfile)}
        />
      </div>

      {request.approvedInvoiceReference ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Issued invoice:{" "}
          <span className="font-medium text-foreground">
            {formatPublicReference(request.approvedInvoiceReference)}
          </span>
        </p>
      ) : null}
      {request.rejectionReason ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Rejected: {request.rejectionReason}
        </p>
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="type-data-label">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatPaymentMethod(
  value: ManualInvoiceRequestResponse["paymentMethod"],
) {
  switch (value) {
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    case "mobile_money":
      return "Mobile money";
    case "transfer":
      return "Transfer";
    default:
      return "Not recorded";
  }
}
