import type {
  CreateIssuedInvoiceTransactionInput,
  InvoiceIssuanceLineRequest,
} from "./invoice-issuance.contracts.js";
import type { InvoiceWithLines, SaleLineInput } from "./sales.contracts.js";

export type ManualInvoiceRequestStatus = "approved" | "pending" | "rejected";

export type ManualInvoiceRequestLineRecord = {
  lineTotal: string;
  quantity: number;
  skuId: string;
  skuSnapshot: { productName: string; sku: string; variantName: string };
  taxAmount: string;
  taxCategory: string | null;
  taxRate: string | null;
  unitPrice: string;
};

export type ManualInvoiceRequestRecord = {
  approvedAt: Date | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedInvoiceId: string | null;
  approvedInvoiceReference: string | null;
  createdAt: Date;
  currencyCode: string;
  currencyScale: number;
  customerBillingAddressLines: string[] | null;
  customerContactId?: string | null;
  customerContactReference?: string | null;
  customerEmail: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone: string | null;
  customerReference?: string | null;
  customerSlug?: string | null;
  customerTaxNumber: string | null;
  id: string;
  lines: ManualInvoiceRequestLineRecord[];
  locationId: string;
  locationName: string | null;
  paymentMethod: "card" | "cash" | "mobile_money" | "transfer" | null;
  reason: string;
  reference: string;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  requestedBy: string;
  requestedByName: string | null;
  status: ManualInvoiceRequestStatus;
  subtotalAmount: string;
  supportingNote: string | null;
  taxAmount: string;
  totalAmount: string;
  updatedAt: Date;
};

export type CreateManualInvoiceRequestInput = {
  createdBy: string;
  customerBillingAddressLines?: string[] | null;
  customerContactReference?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerSlug?: string | null;
  customerTaxNumber?: string | null;
  lines: InvoiceIssuanceLineRequest[];
  locationId: string;
  paymentMethod?: "card" | "cash" | "mobile_money" | "transfer" | null;
  reason: string;
  supportingNote?: string | null;
};

export type CreateManualInvoiceRequestTransactionInput = {
  createdBy: string;
  customerBillingAddressLines: string[] | null;
  customerContactId: string | null;
  customerEmail: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTaxNumber: string | null;
  currencyCode: string;
  currencyScale: number;
  lineItems: SaleLineInput[];
  locationId: string;
  now: Date;
  paymentMethod: "card" | "cash" | "mobile_money" | "transfer" | null;
  reason: string;
  reference: string;
  subtotalAmount: string;
  supportingNote: string | null;
  taxAmount: string;
  totalAmount: string;
};

export type ManualInvoiceRequestListInput = {
  locationIds: readonly string[];
  page: number;
  pageSize: number;
  q?: string;
  status?: ManualInvoiceRequestStatus;
};

export type ManualInvoiceRequestRepository = {
  approveRequestTransaction: (input: {
    approvedBy: string;
    invoice: CreateIssuedInvoiceTransactionInput;
    note: string | null;
    now: Date;
    requestId: string;
  }) => Promise<{
    invoice: InvoiceWithLines;
    request: ManualInvoiceRequestRecord;
  }>;
  createRequestTransaction: (
    input: CreateManualInvoiceRequestTransactionInput,
  ) => Promise<ManualInvoiceRequestRecord>;
  findByReference: (
    reference: string,
  ) => Promise<ManualInvoiceRequestRecord | null>;
  listByLocations: (input: ManualInvoiceRequestListInput) => Promise<{
    items: ManualInvoiceRequestRecord[];
    total: number;
  }>;
  rejectRequestTransaction: (input: {
    actorId: string;
    now: Date;
    reason: string;
    requestId: string;
  }) => Promise<ManualInvoiceRequestRecord>;
};
