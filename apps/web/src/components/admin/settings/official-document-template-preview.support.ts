import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

export const OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS = [
  {
    key: "sales_receipt",
    label: "Sales receipt",
    title: "Sales Receipt",
  },
  {
    key: "credit_note",
    label: "Credit note",
    title: "Credit Note",
  },
  {
    key: "goods_transfer_note",
    label: "Goods transfer note",
    title: "Goods Transfer Note",
  },
] as const;

export type OfficialDocumentTemplatePreviewKey =
  (typeof OFFICIAL_DOCUMENT_TEMPLATE_PREVIEWS)[number]["key"];

export function getPreviewReference(
  key: OfficialDocumentTemplatePreviewKey,
  values: Pick<
    OfficialDocumentSettingsFormValues,
    "gtnPrefix" | "invoicePrefix" | "receiptPrefix"
  >,
) {
  switch (key) {
    case "credit_note":
      return `${values.invoicePrefix}-000042-CN`;
    case "goods_transfer_note":
      return `${values.gtnPrefix}-PREVIEW-001`;
    case "sales_receipt":
      return `${values.receiptPrefix}-PREVIEW-001`;
  }
}

export function getPreviewStatus(key: OfficialDocumentTemplatePreviewKey) {
  switch (key) {
    case "credit_note":
      return "Refund processed";
    case "goods_transfer_note":
      return "In transit";
    case "sales_receipt":
      return "Confirmed";
  }
}

export function getPreviewRecipientLines(
  key: OfficialDocumentTemplatePreviewKey,
) {
  switch (key) {
    case "credit_note":
      return [
        "Original sale: RCT-000042",
        "Customer refund request",
        "Return reason and approved quantities",
      ];
    case "goods_transfer_note":
      return [
        "Source: Main warehouse",
        "Destination: Airport branch",
        "Supply request: SR-000118",
      ];
    case "sales_receipt":
      return [
        "Walk-in customer or portal account",
        "Customer email, phone, and billing address",
        "Payment and fulfilment details",
      ];
  }
}

export function isGoodsTransferTemplate(
  key: OfficialDocumentTemplatePreviewKey,
) {
  return key === "goods_transfer_note";
}
