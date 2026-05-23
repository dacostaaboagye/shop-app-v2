import type {
  ManualInvoiceRequestResponse,
  ManualInvoiceRequestStatus,
} from "@shop/contracts";
import type { MoneyProfile } from "@/lib/money/format-money";

export const MANUAL_INVOICE_STATUS_OPTIONS = [
  "all",
  "pending",
  "approved",
  "rejected",
] as const;

export type ManualInvoiceStatusFilter =
  (typeof MANUAL_INVOICE_STATUS_OPTIONS)[number];

export function getManualInvoiceStatusLabel(
  status: ManualInvoiceRequestStatus | ManualInvoiceStatusFilter,
) {
  switch (status) {
    case "all":
      return "All";
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
  }
}

export function getManualInvoiceStatusVariant(
  status: ManualInvoiceRequestStatus,
) {
  switch (status) {
    case "approved":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "rejected":
      return "destructive" as const;
  }
}

export function getManualInvoiceMoneyProfile(
  request: Pick<ManualInvoiceRequestResponse, "currencyCode" | "currencyScale">,
): MoneyProfile {
  return {
    currencyCode: request.currencyCode,
    currencyScale: request.currencyScale,
    locale: "en-GH",
  };
}
