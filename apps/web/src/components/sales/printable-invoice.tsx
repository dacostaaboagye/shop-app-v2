"use client";

import { forwardRef } from "react";

export type PrintableInvoiceLine = {
  skuId: string;
  skuSnapshot: { sku: string; variantName: string; productName: string };
  quantity: number;
  unitPrice: string;
  taxAmount: string;
  lineTotal: string;
};

export type PrintableInvoiceData = {
  reference: string;
  type: string;
  status: string;
  paymentMethod: string | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  confirmedAt: string | null;
  createdAt: string;
  notes: string | null;
  attributedWorkerId?: string | null;
  attributedWorkerName?: string | null;
  attributedWorkerEmail?: string | null;
  lines: PrintableInvoiceLine[];
};

const SEP = "- - - - - - - - - - - - - - - - - -";

function fmt(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PrintableInvoice = forwardRef<
  HTMLDivElement,
  { invoice: PrintableInvoiceData }
>(({ invoice }, ref) => {
  const date = invoice.confirmedAt
    ? new Date(invoice.confirmedAt)
    : new Date(invoice.createdAt);

  const paymentLabel =
    invoice.paymentMethod === "mobile_money"
      ? "Mobile Money"
      : invoice.paymentMethod
        ? fmt(invoice.paymentMethod)
        : "—";

  const isCredit = invoice.type === "credit_note";
  const showTaxLine = parseFloat(invoice.taxAmount) > 0;
  const showSubtotal =
    parseFloat(invoice.subtotalAmount) !== parseFloat(invoice.totalAmount);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: "1.55",
        width: "100%",
        padding: "8px 14px 16px",
        color: "#000",
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <p
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            letterSpacing: "4px",
            margin: "0 0 2px",
          }}
        >
          RECEIPT
        </p>
        {isCredit && (
          <p style={{ fontSize: "11px", fontWeight: "bold", margin: 0 }}>
            *** CREDIT / RETURN ***
          </p>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: "10px", color: "#555", margin: "0 0 8px" }}>
        {SEP}
      </p>

      {/* Invoice meta */}
      <div style={{ marginBottom: "8px" }}>
        <Row label="Ref" value={invoice.reference} bold />
        <Row
          label="Date"
          value={date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
        <Row
          label="Time"
          value={date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <Row label="Payment" value={paymentLabel} />
      </div>

      <p style={{ textAlign: "center", fontSize: "10px", color: "#555", margin: "0 0 8px" }}>
        {SEP}
      </p>

      {/* Line items */}
      <div style={{ marginBottom: "8px" }}>
        {invoice.lines.map((line) => (
          <div key={line.skuId} style={{ marginBottom: "8px" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 1px", wordBreak: "break-word" }}>
              {line.skuSnapshot.productName}
            </p>
            <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#444" }}>
              {line.skuSnapshot.variantName}
            </p>
            <div
              style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}
            >
              <span>
                {line.quantity} &times; {line.unitPrice}
              </span>
              <span style={{ fontWeight: "bold" }}>{line.lineTotal}</span>
            </div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: "10px", color: "#555", margin: "0 0 8px" }}>
        {SEP}
      </p>

      {/* Totals */}
      <div style={{ marginBottom: "8px" }}>
        {showSubtotal && <Row label="Subtotal" value={invoice.subtotalAmount} />}
        {showTaxLine && <Row label="Tax" value={invoice.taxAmount} />}
        <Row
          label="TOTAL"
          value={invoice.totalAmount}
          bold
          large
        />
      </div>

      {/* Notes */}
      {invoice.notes ? (
        <>
          <p style={{ textAlign: "center", fontSize: "10px", color: "#555", margin: "0 0 6px" }}>
            {SEP}
          </p>
          <p style={{ fontSize: "10px", fontStyle: "italic", margin: "0 0 6px" }}>
            {invoice.notes}
          </p>
        </>
      ) : null}

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: "10px", color: "#555", margin: "12px 0 6px" }}>
        {SEP}
      </p>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontWeight: "bold", margin: "0 0 3px" }}>Thank you!</p>
        <p style={{ fontSize: "9px", color: "#777", margin: 0 }}>
          {invoice.reference} &bull; {invoice.status.toUpperCase()}
        </p>
      </div>
    </div>
  );
});

PrintableInvoice.displayName = "PrintableInvoice";

function Row({
  label,
  value,
  bold,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "8px",
        fontWeight: bold ? "bold" : "normal",
        fontSize: large ? "14px" : "12px",
        marginBottom: large ? "2px" : "0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
