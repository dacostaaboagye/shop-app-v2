import type {
  AdminCustomerDetail,
  AdminCustomerSummary,
} from "@shop/contracts";

export const CUSTOMER_STATUS_LABELS: Record<
  AdminCustomerSummary["status"],
  string
> = {
  active: "Active",
  blocked: "Blocked",
  inactive: "Inactive",
};

export const CUSTOMER_TYPE_LABELS: Record<
  AdminCustomerSummary["customerType"],
  string
> = {
  business: "Business",
  individual: "Individual",
};

export function formatCustomerDisplayName(
  customer: Pick<AdminCustomerSummary, "displayName" | "reference">,
) {
  return customer.displayName || customer.reference;
}

export function toCustomerFormValues(
  customer: AdminCustomerDetail,
): CustomerFormValues {
  return {
    creditLimitAmount: customer.creditLimitAmount ?? "",
    customerType: customer.customerType,
    defaultCurrencyCode: customer.defaultCurrencyCode ?? "",
    displayName: customer.displayName,
    legalName: customer.legalName ?? "",
    notes: customer.notes ?? "",
    paymentTermsDays: customer.paymentTermsDays,
    status: customer.status,
    taxNumber: customer.taxNumber ?? "",
  };
}

export type CustomerFormValues = {
  creditLimitAmount: string;
  customerType: "business" | "individual";
  defaultCurrencyCode: string;
  displayName: string;
  legalName: string;
  notes: string;
  paymentTermsDays: number;
  status: "active" | "blocked" | "inactive";
  taxNumber: string;
};
