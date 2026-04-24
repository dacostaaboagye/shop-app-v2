import { AppError } from "../_core/errors/app-error.js";

export type InvoiceRecord = {
  attributedWorkerId: string | null;
  attributedWorkerName: string | null;
  attributedWorkerEmail: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
  customerBillingAddressLines: string[] | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerTaxNumber: string | null;
  id: string;
  locationId: string;
  notes: string | null;
  parentInvoiceId: string | null;
  paymentMethod: string | null;
  reference: string;
  status: "confirmed" | "voided";
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  type: "pos" | "portal" | "ecommerce" | "manual" | "credit_note";
  updatedAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
};

export type InvoiceLineItemRecord = {
  createdAt: Date;
  id: string;
  invoiceId: string;
  lineTotal: string;
  quantity: number;
  skuId: string;
  skuSnapshot: { sku: string; variantName: string; productName: string };
  stockMovementId: string | null;
  taxAmount: string;
  taxCategory: string | null;
  taxRate: string | null;
  unitPrice: string;
  updatedAt: Date;
};

export type InvoiceWithLines = InvoiceRecord & {
  lines: InvoiceLineItemRecord[];
};

export type SaleLineInput = {
  invoiceId?: string;
  locationId: string;
  quantity: number;
  skuId: string;
  skuSnapshot: { sku: string; variantName: string; productName: string };
  unitPrice: string;
  taxCategory: string | null;
  taxRate: string | null;
  taxAmount: string;
  lineTotal: string;
};

export type CreateSaleTransactionInput = {
  attributedWorkerId: string;
  confirmedAt: Date;
  createdBy: string;
  customerBillingAddressLines?: string[] | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerTaxNumber?: string | null;
  lineItems: SaleLineInput[];
  locationId: string;
  notes: string | null;
  now: Date;
  paymentMethod: string;
  reference: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
};

export type CreateReturnTransactionInput = {
  attributedWorkerId: string | null;
  confirmedAt: Date;
  createdBy: string;
  lines: {
    lineTotal: string;
    quantity: number;
    skuId: string;
    skuSnapshot: { sku: string; variantName: string; productName: string };
    taxAmount: string;
    taxCategory: string | null;
    taxRate: string | null;
    unitPrice: string;
  }[];
  locationId: string;
  now: Date;
  parentInvoiceId: string;
  reference: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  voidReason: string;
};

export type VariantSaleDetails = {
  isTaxable: boolean;
  name: string;
  productName: string;
  productSlug: string;
  sellingPrice: string;
  sku: string;
  slug: string;
  taxCategory: string | null;
};

export interface PosCatalogVariantRepository {
  getVariantsForSale(
    skuIds: string[],
  ): Promise<Map<string, VariantSaleDetails>>;
}

export class PosSaleError extends AppError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super({
      code: "conflict",
      detail,
      ...(details ? { details } : {}),
      statusCode: 409,
      title: "POS sale error",
    });
  }
}

export class MixedOwnershipSaleError extends AppError {
  constructor() {
    super({
      code: "conflict",
      detail:
        "All items in a POS sale must be assigned to the same worker. Split into separate transactions.",
      statusCode: 409,
      title: "Mixed ownership sale",
    });
  }
}

export class SaleVariantNotFoundError extends AppError {
  constructor(skuId: string) {
    super({
      code: "not_found",
      detail: `Variant ${skuId} does not exist or is archived.`,
      details: { skuId },
      statusCode: 404,
      title: "Variant not found",
    });
  }
}

export class InsufficientStockForSaleError extends AppError {
  constructor(input: {
    availableQuantity: number;
    locationId: string;
    requestedQuantity: number;
    skuId: string;
  }) {
    super({
      code: "conflict",
      detail: "There is not enough available stock to process this sale.",
      details: input,
      statusCode: 409,
      title: "Insufficient stock",
    });
  }
}

export class InvoiceNotFoundError extends AppError {
  constructor(reference: string) {
    super({
      code: "not_found",
      detail: `Invoice ${reference} does not exist.`,
      details: { reference },
      statusCode: 404,
      title: "Invoice not found",
    });
  }
}

export class InvalidReturnError extends AppError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super({
      code: "validation_error",
      detail,
      ...(details ? { details } : {}),
      statusCode: 400,
      title: "Invalid return",
    });
  }
}
