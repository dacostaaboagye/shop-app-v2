import Image from "next/image";
import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";
import {
  getPreviewRecipientLines,
  type OfficialDocumentTemplatePreviewKey,
} from "./official-document-template-preview.support";

export function DocumentBrandBlock({
  logoImageUrl,
  primaryColor,
  values,
}: {
  logoImageUrl: string | null;
  primaryColor: string;
  values: OfficialDocumentSettingsFormValues;
}) {
  if (logoImageUrl) {
    return (
      <div className="relative mx-auto size-16 overflow-hidden rounded-md bg-muted/30">
        <Image
          alt={`${values.brandName} logo`}
          className="object-contain p-1"
          fill
          sizes="64px"
          src={logoImageUrl}
        />
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex size-16 items-center justify-center rounded-md text-base font-semibold text-primary-foreground"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="text-center">
        <p>{textOrPlaceholder(values.logoText, "SA")}</p>
        <p className="mt-0.5 text-[8px] font-medium uppercase opacity-80">
          {textOrPlaceholder(values.brandName, "Brand").slice(0, 10)}
        </p>
      </div>
    </div>
  );
}

export function DocumentMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(130px,1fr)_1.15fr] overflow-hidden rounded-sm">
      <dt className="bg-[var(--document-primary)] px-3 py-2 text-xs font-semibold text-primary-foreground">
        {label}
      </dt>
      <dd className="bg-muted/35 px-3 py-2 text-pretty text-sm tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function DocumentTotalRow({
  label,
  value,
  values,
}: {
  label: string;
  value: string;
  values: OfficialDocumentSettingsFormValues;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="type-support text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">
        {values.defaultDisplayCurrencyCode} {value}
      </span>
    </div>
  );
}

export function PreviewTable({
  templateKey,
  values,
}: {
  templateKey: OfficialDocumentTemplatePreviewKey;
  values: OfficialDocumentSettingsFormValues;
}) {
  const lines = getPreviewLines(templateKey);
  const firstHeader =
    templateKey === "goods_transfer_note" ? "Item" : "Service";

  return (
    <table className="mt-6 w-full table-fixed text-sm">
      <thead>
        <tr className="border-b border-border bg-foreground text-left text-xs text-background">
          <th className="px-3 py-3 font-medium">{firstHeader}</th>
          <th className="w-24 px-3 py-3 font-medium">Unit</th>
          <th className="w-24 px-3 py-3 text-right font-medium">Quantity</th>
          <th className="w-24 px-3 py-3 text-right font-medium">Rate</th>
          <th className="w-24 px-3 py-3 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr className="border-b border-border/70" key={line.name}>
            <td className="px-3 py-3 font-medium">{line.name}</td>
            <td className="px-3 py-3 text-muted-foreground">{line.unit}</td>
            <td className="px-3 py-3 text-right tabular-nums">{line.qty}</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatPreviewAmount(line.price, values, templateKey)}
            </td>
            <td className="px-3 py-3 text-right font-medium tabular-nums">
              {formatPreviewAmount(line.total, values, templateKey)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PreviewTotals({
  templateKey,
  values,
}: {
  templateKey: OfficialDocumentTemplatePreviewKey;
  values: OfficialDocumentSettingsFormValues;
}) {
  if (templateKey === "goods_transfer_note") {
    return (
      <div className="mt-6 rounded-md border border-border bg-muted/25 p-4">
        <p className="text-sm font-semibold">Operational handover</p>
        <div className="mt-3 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <p>Dispatched by: Warehouse manager</p>
          <p>Received by: Pending receipt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex justify-end">
      <div className="w-full max-w-64 rounded-md border border-border bg-muted/25 p-4">
        <DocumentTotalRow label="Subtotal" value="1,200.00" values={values} />
        <DocumentTotalRow label="Tax" value="180.00" values={values} />
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {values.defaultDisplayCurrencyCode} 1,380.00
          </span>
        </div>
      </div>
    </div>
  );
}

export function PreviewRecipientBlock({
  templateKey,
}: {
  templateKey: OfficialDocumentTemplatePreviewKey;
}) {
  const lines = getPreviewRecipientLines(templateKey);
  return (
    <div>
      <p className="text-sm font-semibold">
        {templateKey === "goods_transfer_note" ? "Transfer route" : "Recipient"}
      </p>
      <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export function getAddressLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function textOrPlaceholder(value: string, placeholder: string) {
  return value.trim() || placeholder;
}

export const PREVIEW_LINES = [
  {
    name: "Retail stock item",
    price: "400.00",
    qty: 2,
    total: "800.00",
    unit: "Each",
  },
  {
    name: "Transferred stock item",
    price: "400.00",
    qty: 1,
    total: "400.00",
    unit: "Each",
  },
] as const;

function getPreviewLines(templateKey: OfficialDocumentTemplatePreviewKey) {
  if (templateKey === "credit_note") return CREDIT_NOTE_PREVIEW_LINES;
  if (templateKey === "goods_transfer_note") return GTN_PREVIEW_LINES;
  return PREVIEW_LINES;
}

function formatPreviewAmount(
  value: string,
  values: OfficialDocumentSettingsFormValues,
  templateKey: OfficialDocumentTemplatePreviewKey,
) {
  if (templateKey === "goods_transfer_note") return value;
  return `${values.defaultDisplayCurrencyCode} ${value}`;
}

const CREDIT_NOTE_PREVIEW_LINES = [
  {
    name: "Returned retail stock item",
    price: "-400.00",
    qty: 1,
    total: "-400.00",
    unit: "Each",
  },
] as const;

const GTN_PREVIEW_LINES = [
  {
    name: "Transferred stock item",
    price: "N/A",
    qty: 24,
    total: "In transit",
    unit: "Carton",
  },
] as const;
