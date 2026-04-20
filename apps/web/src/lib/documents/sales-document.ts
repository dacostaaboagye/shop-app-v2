import { formatMoney } from "@/lib/money/format-money";
import {
  downloadDocumentFile,
  type ShareResult,
  shareDocumentFile,
} from "./document-file-actions";
import {
  DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
  type OfficialDocumentProfile,
} from "./official-document-profile";

export {
  downloadDocumentFile,
  shareDocumentFile,
} from "./document-file-actions";

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
  locationId: string;
  notes: string | null;
  attributedWorkerId?: string | null;
  attributedWorkerName?: string | null;
  attributedWorkerEmail?: string | null;
  lines: PrintableInvoiceLine[];
};

export function getSalesDocumentTitle(invoice: PrintableInvoiceData): string {
  if (invoice.type === "credit_note") return "Credit Note";
  return invoice.status === "voided"
    ? "Voided Sales Document"
    : "Sales Receipt";
}

export function formatDocumentMoney(
  value: string,
  profile: OfficialDocumentProfile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
): string {
  return formatMoney(value, profile);
}

export function getSalesDocumentFilename(
  invoice: PrintableInvoiceData,
): string {
  const safeReference = invoice.reference.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${safeReference || "sales-document"}.html`;
}

export function buildSalesDocumentHtml(
  invoice: PrintableInvoiceData,
  profile: OfficialDocumentProfile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
): string {
  const date = new Date(invoice.confirmedAt ?? invoice.createdAt);
  const issuedAt = date.toLocaleString(profile.locale, {
    timeZone: profile.timezone,
  });
  const title = getSalesDocumentTitle(invoice);
  const lineRows = invoice.lines
    .map((line) => toLineRowHtml(line, profile))
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} ${escapeHtml(invoice.reference)}</title>
  <style>
    :root {
      color: hsl(24 18% 14%);
      background: hsl(36 30% 96%);
      font-family: "Source Sans 3", "Segoe UI", sans-serif;
    }
    body { margin: 0; padding: 32px; background: hsl(36 30% 96%); }
    .document { max-width: 840px; margin: 0 auto; background: white; border: 1px solid hsl(30 18% 82%); box-shadow: 0 24px 80px hsl(24 18% 14% / 0.12); }
    .band { height: 10px; background: linear-gradient(90deg, ${profile.primaryColor}, ${profile.accentColor}); }
    .content { padding: 36px; }
    .header, .meta, .total-row, .footer-grid { display: flex; justify-content: space-between; gap: 24px; }
    .brand { display: flex; gap: 14px; align-items: flex-start; }
    .mark { display: grid; place-items: center; width: 58px; height: 58px; background: ${profile.primaryColor}; color: white; font-weight: 800; letter-spacing: 0.08em; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 26px; letter-spacing: 0.08em; text-transform: uppercase; }
    h2 { font-size: 15px; margin-bottom: 8px; color: ${profile.primaryColor}; }
    .muted { color: hsl(27 10% 42%); }
    .document-title { text-align: right; }
    .pill { display: inline-block; margin-top: 8px; padding: 5px 10px; border: 1px solid hsl(30 18% 82%); border-radius: 999px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .section { margin-top: 28px; padding-top: 22px; border-top: 1px solid hsl(30 18% 86%); }
    .meta { flex-wrap: wrap; }
    .meta div { min-width: 160px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: hsl(27 10% 42%); }
    .value { margin-top: 4px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: hsl(27 10% 42%); border-bottom: 1px solid hsl(30 18% 82%); padding: 10px 0; }
    td { padding: 12px 0; border-bottom: 1px solid hsl(30 18% 90%); vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row { align-items: center; margin-top: 18px; padding: 18px; background: hsl(174 30% 94%); }
    .total-row strong { font-size: 22px; }
    .footer { margin-top: 32px; padding-top: 18px; border-top: 1px solid hsl(30 18% 86%); font-size: 13px; }
    @media print {
      body { padding: 0; background: white; }
      .document { border: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="document">
    <div class="band"></div>
    <div class="content">
      <header class="header">
        <div class="brand">
          <div class="mark">${escapeHtml(profile.logoText)}</div>
          <div>
            <h1>${escapeHtml(profile.brandName)}</h1>
            <p class="muted">${escapeHtml(profile.legalName)}</p>
            <p class="muted">${profile.addressLines.map(escapeHtml).join("<br>")}</p>
          </div>
        </div>
        <div class="document-title">
          <h2>${escapeHtml(title)}</h2>
          <p class="value">${escapeHtml(invoice.reference)}</p>
          <span class="pill">${escapeHtml(invoice.status)}</span>
        </div>
      </header>
      <section class="section meta">
        <div><p class="label">Issued At</p><p class="value">${escapeHtml(issuedAt)}</p></div>
        <div><p class="label">Payment</p><p class="value">${escapeHtml(formatLabel(invoice.paymentMethod ?? "not recorded"))}</p></div>
        <div><p class="label">Tax Number</p><p class="value">${escapeHtml(profile.taxNumber)}</p></div>
        <div><p class="label">Registration</p><p class="value">${escapeHtml(profile.registrationNumber)}</p></div>
      </section>
      <section class="section">
        <h2>Line Items</h2>
        <table>
          <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
          <tbody>${lineRows}</tbody>
        </table>
        <div class="total-row">
          <span>Total Due</span>
          <strong>${escapeHtml(formatDocumentMoney(invoice.totalAmount, profile))}</strong>
        </div>
      </section>
      ${invoice.notes ? `<section class="section"><h2>Notes</h2><p>${escapeHtml(invoice.notes)}</p></section>` : ""}
      <footer class="footer">
        <div class="footer-grid">
          <p>${escapeHtml(profile.footer)}</p>
          <p class="muted">${escapeHtml(profile.phone)} · ${escapeHtml(profile.email)} · ${escapeHtml(profile.website)}</p>
        </div>
      </footer>
    </div>
  </main>
</body>
</html>`;
}

export function downloadSalesDocument(
  invoice: PrintableInvoiceData,
  profile: OfficialDocumentProfile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
): boolean {
  return downloadDocumentFile(createSalesDocumentFile(invoice, profile));
}

export async function shareSalesDocument(
  invoice: PrintableInvoiceData,
  profile: OfficialDocumentProfile = DEFAULT_OFFICIAL_DOCUMENT_PROFILE,
): Promise<ShareResult> {
  if (typeof navigator === "undefined") return "unsupported";

  return shareDocumentFile(
    createSalesDocumentFile(invoice, profile),
    `${getSalesDocumentTitle(invoice)} ${invoice.reference}`,
  );
}

function createSalesDocumentFile(
  invoice: PrintableInvoiceData,
  profile: OfficialDocumentProfile,
): File {
  return new File(
    [buildSalesDocumentHtml(invoice, profile)],
    getSalesDocumentFilename(invoice),
    {
      type: "text/html;charset=utf-8",
    },
  );
}

function toLineRowHtml(
  line: PrintableInvoiceLine,
  profile: OfficialDocumentProfile,
): string {
  return `<tr>
    <td><strong>${escapeHtml(line.skuSnapshot.productName)}</strong><br><span class="muted">${escapeHtml(line.skuSnapshot.variantName)} · ${escapeHtml(line.skuSnapshot.sku)}</span></td>
    <td class="num">${line.quantity}</td>
    <td class="num">${escapeHtml(formatDocumentMoney(line.unitPrice, profile))}</td>
    <td class="num"><strong>${escapeHtml(formatDocumentMoney(line.lineTotal, profile))}</strong></td>
  </tr>`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
