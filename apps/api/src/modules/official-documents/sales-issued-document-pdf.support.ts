import type {
  InvoiceResponse,
  OfficialDocumentProfileResponse,
} from "@shop/contracts";

export function getDocumentTitle(invoice: InvoiceResponse): string {
  if (invoice.type === "credit_note") return "Credit Note";
  if (invoice.type === "adjusted") return "Adjusted Invoice";
  return invoice.status === "voided"
    ? "Voided Sales Document"
    : "Sales Receipt";
}

export function getDocumentTraceabilityRows(
  invoice: InvoiceResponse,
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];

  const pushRow = (label: string, value: string | null | undefined) => {
    const normalized = value?.trim();
    if (!normalized || normalized === invoice.reference) return;
    if (rows.some(([, existing]) => existing === normalized)) return;
    rows.push([label, normalized]);
  };

  pushRow("Source Invoice", invoice.parentInvoiceReference);
  pushRow("Revision Root", invoice.revisionChain.revisionRootReference);
  pushRow("Credit Note", invoice.revisionChain.revisionCreditNoteReference);
  pushRow(
    "Replacement Invoice",
    invoice.replacementInvoiceReference ??
      invoice.revisionChain.replacementInvoiceReference,
  );
  pushRow("Current Payable", invoice.revisionChain.currentPayableReference);

  return rows;
}

export function formatMoney(
  value: string,
  profile: OfficialDocumentProfileResponse,
): string {
  const trimmed = value.trim();
  if (!trimmed)
    return `${profile.currencyCode} ${(0).toFixed(profile.currencyScale)}`;
  if (/([A-Z]{3}|[$\u20ac\u00a3\u20b5])/.test(trimmed)) return trimmed;
  return `${profile.currencyCode} ${trimmed}`;
}

export function safeFilename(reference: string): string {
  return reference.replace(/[^a-zA-Z0-9_-]+/g, "-") || "sales-document";
}

export function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toPdfColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  const hsl =
    /^hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)$/.exec(
      trimmed,
    );
  if (!hsl) return fallback;
  return hslToHex(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
