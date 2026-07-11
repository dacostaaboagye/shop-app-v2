import type { ReferenceSequenceKey } from "../public-identifiers/reference-number-formats.js";
import type {
  InvoiceWithLines,
  SaleLineInput,
  SalesCurrencySnapshot,
} from "./sales.contracts.js";

export const invoiceIssuanceChannels = [
  "pos",
  "portal",
  "ecommerce",
  "manual",
] as const;

export type InvoiceIssuanceChannel = (typeof invoiceIssuanceChannels)[number];

export const invoiceSequenceByChannel = {
  ecommerce: "invoice-web",
  manual: "invoice-manual",
  portal: "invoice-portal",
  pos: "invoice-pos",
} satisfies Record<InvoiceIssuanceChannel, ReferenceSequenceKey>;

export type InvoiceIssuanceLineRequest = {
  quantity: number;
  skuId: string;
  unitPrice?: string;
};

export type InvoiceCustomerSnapshotInput = {
  billingAddressLines?: string[] | null;
  customerContactId?: string | null;
  customerContactReference?: string | null;
  customerId?: string | null;
  customerReference?: string | null;
  customerSlug?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  taxNumber?: string | null;
};

export type InvoiceSettlementContextInput = {
  paymentMethod?: string | null;
};

export type PrepareInvoiceInput = {
  attributedWorkerId: string | null;
  channel: InvoiceIssuanceChannel;
  classification: "outgoing" | "internal";
  createdBy: string;
  customer?: InvoiceCustomerSnapshotInput;
  idempotencyKey?: string | null;
  lines: InvoiceIssuanceLineRequest[];
  locationId: string;
  notes?: string | null;
  now?: Date;
  settlement?: InvoiceSettlementContextInput;
  sourceReference?: string | null;
};

export type CreateIssuedInvoiceTransactionInput = {
  attributedWorkerId: string | null;
  channel: InvoiceIssuanceChannel;
  classification: "outgoing" | "internal";
  confirmedAt: Date;
  createdBy: string;
  customerBillingAddressLines?: string[] | null;
  customerContactId?: string | null;
  customerContactReference?: string | null;
  currencyCode: SalesCurrencySnapshot["currencyCode"];
  currencyScale: SalesCurrencySnapshot["currencyScale"];
  customerEmail?: string | null;
  customerId?: string | null;
  customerReference?: string | null;
  customerSlug?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerTaxNumber?: string | null;
  lineItems: SaleLineInput[];
  locationId: string;
  notes: string | null;
  now: Date;
  paymentMethod: string | null;
  reference: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
};

export type IssuedInvoiceRepository = {
  createIssuedInvoiceTransaction: (
    input: CreateIssuedInvoiceTransactionInput,
  ) => Promise<InvoiceWithLines>;
};
