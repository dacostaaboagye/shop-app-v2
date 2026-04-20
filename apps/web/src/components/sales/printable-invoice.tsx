"use client";

import { forwardRef } from "react";
import {
  DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
  type OfficialDocumentProfile,
} from "@/lib/documents/official-document-profile";
import {
  formatDocumentMoney,
  getSalesDocumentTitle,
} from "@/lib/documents/sales-document";
import type { PrintableInvoiceData } from "@/lib/documents/sales-document";

const SEP = "- - - - - - - - - - - - - - - - - -";

function fmt(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PrintableInvoice = forwardRef<
  HTMLDivElement,
  { invoice: PrintableInvoiceData; profile?: OfficialDocumentProfile }
>(({ invoice, profile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE }, ref) => {
  const date = new Date(invoice.confirmedAt ?? invoice.createdAt);
  const paymentLabel =
    invoice.paymentMethod === "mobile_money"
      ? "Mobile Money"
      : invoice.paymentMethod
        ? fmt(invoice.paymentMethod)
        : "Not recorded";
  const isCredit = invoice.type === "credit_note";
  const showTaxLine = parseFloat(invoice.taxAmount) > 0;
  const showSubtotal =
    parseFloat(invoice.subtotalAmount) !== parseFloat(invoice.totalAmount);

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: "white",
        color: "black",
        fontFamily: "'Source Sans 3', 'Segoe UI', sans-serif",
        fontSize: "12px",
        lineHeight: "1.55",
        padding: "8px 14px 16px",
        width: "100%",
      }}
    >
      <header style={{ borderTop: `6px solid ${profile.primaryColor}`, paddingTop: "10px" }}>
        <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <div
              style={{
                alignItems: "center",
                backgroundColor: profile.primaryColor,
                color: "white",
                display: "flex",
                fontSize: "13px",
                fontWeight: "bold",
                height: "36px",
                justifyContent: "center",
                letterSpacing: "1px",
                width: "36px",
              }}
            >
              {profile.logoText}
            </div>
            <div>
              <p style={{ fontWeight: "bold", margin: 0 }}>{profile.brandName}</p>
              <p style={{ color: "dimgray", fontSize: "9px", margin: 0 }}>
                {profile.legalName}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: "bold", margin: 0 }}>
              {getSalesDocumentTitle(invoice)}
            </p>
            <p style={{ color: "dimgray", fontSize: "9px", margin: 0 }}>
              {invoice.status.toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      <div style={{ margin: "12px 0 10px", textAlign: "center" }}>
        <p
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            letterSpacing: "3px",
            margin: "0 0 2px",
          }}
        >
          OFFICIAL DOCUMENT
        </p>
        {isCredit ? (
          <p style={{ fontSize: "11px", fontWeight: "bold", margin: 0 }}>
            *** CREDIT / RETURN ***
          </p>
        ) : null}
      </div>

      <Separator />

      <section style={{ marginBottom: "8px" }}>
        <Row label="Ref" value={invoice.reference} bold />
        <Row label="Date" value={date.toLocaleDateString(profile.locale, { timeZone: profile.timezone })} />
        <Row label="Time" value={date.toLocaleTimeString(profile.locale, { hour: "2-digit", minute: "2-digit", timeZone: profile.timezone })} />
        <Row label="Payment" value={paymentLabel} />
        <Row label="Currency" value={profile.currencyCode} />
        <Row label="Tax ID" value={profile.taxNumber} />
      </section>

      <Separator />

      <section style={{ marginBottom: "8px" }}>
        {invoice.lines.map((line) => (
          <div key={line.skuId} style={{ marginBottom: "8px" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 1px", wordBreak: "break-word" }}>
              {line.skuSnapshot.productName}
            </p>
            <p style={{ color: "darkslategray", fontSize: "11px", margin: "0 0 2px" }}>
              {line.skuSnapshot.variantName}
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
              <span>
                {line.quantity} &times; {formatDocumentMoney(line.unitPrice, profile)}
              </span>
              <span style={{ fontWeight: "bold" }}>
                {formatDocumentMoney(line.lineTotal, profile)}
              </span>
            </div>
          </div>
        ))}
      </section>

      <Separator />

      <section style={{ marginBottom: "8px" }}>
        {showSubtotal ? (
          <Row label="Subtotal" value={formatDocumentMoney(invoice.subtotalAmount, profile)} />
        ) : null}
        {showTaxLine ? (
          <Row label="Tax" value={formatDocumentMoney(invoice.taxAmount, profile)} />
        ) : null}
        <Row label="TOTAL" value={formatDocumentMoney(invoice.totalAmount, profile)} bold large />
      </section>

      {invoice.notes ? (
        <>
          <Separator />
          <p style={{ fontSize: "10px", fontStyle: "italic", margin: "0 0 6px" }}>
            {invoice.notes}
          </p>
        </>
      ) : null}

      <footer style={{ marginTop: "12px", textAlign: "center" }}>
        <Separator />
        <p style={{ fontWeight: "bold", margin: "0 0 3px" }}>{profile.footer}</p>
        <p style={{ color: "dimgray", fontSize: "9px", margin: "0 0 3px" }}>
          {profile.phone} &bull; {profile.email} &bull; {profile.website}
        </p>
        <p style={{ color: "gray", fontSize: "9px", margin: 0 }}>
          {invoice.reference} &bull; {invoice.status.toUpperCase()}
        </p>
      </footer>
    </div>
  );
});

PrintableInvoice.displayName = "PrintableInvoice";

function Separator() {
  return (
    <p style={{ color: "dimgray", fontSize: "10px", margin: "0 0 8px", textAlign: "center" }}>
      {SEP}
    </p>
  );
}

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
        fontSize: large ? "14px" : "12px",
        fontWeight: bold ? "bold" : "normal",
        gap: "8px",
        justifyContent: "space-between",
        marginBottom: large ? "2px" : "0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
