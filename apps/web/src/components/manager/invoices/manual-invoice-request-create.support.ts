import type { VariantSearchResult } from "@shop/contracts";
import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from "@tanstack/react-form";

export type ManualInvoiceDraftLine = {
  quantity: string;
  sku: string;
  skuId: string;
  title: string;
  unitPrice: string;
};

export type ManualInvoiceRequestFormValues = {
  address: string;
  customerContactReference: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerSlug: string;
  customerTaxNumber: string;
  paymentMethod: string;
  reason: string;
  supportingNote: string;
};

type ManualInvoiceFormValidate =
  | FormValidateOrFn<ManualInvoiceRequestFormValues>
  | undefined;
type ManualInvoiceFormAsyncValidate =
  | FormAsyncValidateOrFn<ManualInvoiceRequestFormValues>
  | undefined;

export type ManualInvoiceForm = ReactFormExtendedApi<
  ManualInvoiceRequestFormValues,
  ManualInvoiceFormValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormValidate,
  ManualInvoiceFormAsyncValidate,
  ManualInvoiceFormAsyncValidate,
  unknown
>;

export const MANUAL_INVOICE_REQUEST_DEFAULT_VALUES: ManualInvoiceRequestFormValues =
  {
    address: "",
    customerContactReference: "",
    customerEmail: "",
    customerName: "",
    customerPhone: "",
    customerSlug: "",
    customerTaxNumber: "",
    paymentMethod: "none",
    reason: "",
    supportingNote: "",
  };

export function getCustomerSelectionError(
  value: ManualInvoiceRequestFormValues,
  wasSubmitted: boolean,
): string {
  if (!wasSubmitted) return "";
  if (value.customerSlug || value.customerName.trim()) return "";
  return "Select a CRM customer or enter a customer name.";
}

export function createDraftLine(
  variant: VariantSearchResult,
): ManualInvoiceDraftLine {
  return {
    quantity: "1",
    sku: variant.sku,
    skuId: variant.variantId,
    title: `${variant.productName} - ${variant.name}`,
    unitPrice: variant.sellingPrice,
  };
}

export function normalizeAddressLines(value: string): string[] | undefined {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

export function isValidDraftLine(line: ManualInvoiceDraftLine): boolean {
  const quantity = Number.parseInt(line.quantity, 10);
  const price = Number(line.unitPrice);
  return (
    Number.isInteger(quantity) &&
    quantity > 0 &&
    Number.isFinite(price) &&
    price >= 0
  );
}

export function getDraftLinesError(
  lines: ManualInvoiceDraftLine[],
  wasSubmitted: boolean,
): string {
  if (!wasSubmitted) return "";
  if (lines.length === 0) return "Add at least one invoice line.";
  if (lines.some((line) => !isValidDraftLine(line))) {
    return "Each line needs a quantity above zero and a valid unit price.";
  }
  return "";
}
