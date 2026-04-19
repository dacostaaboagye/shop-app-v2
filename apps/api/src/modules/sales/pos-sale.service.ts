import type { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import {
  InvoiceNotFoundError,
  InvalidReturnError,
  MixedOwnershipSaleError,
  SaleVariantNotFoundError,
  type CreateSaleTransactionInput,
  type InvoiceWithLines,
  type PosCatalogVariantRepository,
} from "./sales.contracts.js";
import type { PostgresInvoiceRepository } from "./postgres-invoice.repository.js";
import type { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";

type PosSaleServiceDeps = {
  catalogVariantRepository: PosCatalogVariantRepository;
  invoiceRepository: Pick<PostgresInvoiceRepository, "createSaleTransaction" | "createReturnTransaction"> & Pick<PostgresInvoiceQueryRepository, "findByReference">;
  referenceNumberService: ReferenceNumberService;
  salesAttributionService: SalesAttributionService;
};

type ProcessSaleInput = {
  createdBy: string;
  lines: { quantity: number; skuId: string; unitPrice?: string }[];
  locationId: string;
  notes?: string;
  paymentMethod: "cash" | "card" | "mobile_money" | "transfer";
  now?: Date;
};

type ProcessReturnInput = {
  createdBy: string;
  lines: { quantity: number; skuId: string }[];
  parentReference: string;
  reason: string;
  now?: Date;
};

export class PosSaleService {
  constructor(private readonly deps: PosSaleServiceDeps) {}

  async processSale(input: ProcessSaleInput): Promise<InvoiceWithLines> {
    const now = input.now ?? new Date();

    const variantDetails = await this.deps.catalogVariantRepository.getVariantsForSale(
      input.lines.map((l) => l.skuId),
    );

    for (const line of input.lines) {
      if (!variantDetails.has(line.skuId)) {
        throw new SaleVariantNotFoundError(line.skuId);
      }
    }

    const attributions = await Promise.all(
      input.lines.map((line) =>
        this.deps.salesAttributionService.attributeSale({
          locationId: input.locationId,
          skuId: line.skuId,
          soldAt: now,
        }),
      ),
    );

    const workerIds = new Set(attributions.map((a) => a.workerId));
    if (workerIds.size > 1) {
      throw new MixedOwnershipSaleError();
    }
    const attributedWorkerId = [...workerIds][0]!;

    const reference = await this.deps.referenceNumberService.generateReference({
      now,
      sequenceKey: "invoice-pos",
    });

    const lineItems = input.lines.map((line) => {
      const variant = variantDetails.get(line.skuId)!;
      const customPrice = line.unitPrice !== undefined && line.unitPrice !== ""
        ? parseFloat(line.unitPrice)
        : NaN;
      const unitPrice = !isNaN(customPrice) && customPrice >= 0
        ? customPrice
        : parseFloat(variant.sellingPrice);
      const subtotal = roundCurrency(unitPrice * line.quantity);
      const taxAmount = 0;
      const lineTotal = subtotal;

      return {
        lineTotal: lineTotal.toFixed(2),
        locationId: input.locationId,
        quantity: line.quantity,
        skuId: line.skuId,
        skuSnapshot: {
          productName: variant.productName,
          sku: variant.sku,
          variantName: variant.name,
        },
        taxAmount: taxAmount.toFixed(2),
        taxCategory: variant.taxCategory,
        taxRate: null as string | null,
        unitPrice: unitPrice.toFixed(2),
      };
    });

    const subtotalAmount = lineItems.reduce(
      (sum, l) => sum + parseFloat(l.lineTotal),
      0,
    );
    const totalTaxAmount = 0;
    const totalAmount = subtotalAmount + totalTaxAmount;

    const transactionInput: CreateSaleTransactionInput = {
      attributedWorkerId,
      confirmedAt: now,
      createdBy: input.createdBy,
      lineItems,
      locationId: input.locationId,
      notes: input.notes ?? null,
      now,
      paymentMethod: input.paymentMethod,
      reference,
      subtotalAmount: subtotalAmount.toFixed(2),
      taxAmount: totalTaxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };

    return this.deps.invoiceRepository.createSaleTransaction(transactionInput);
  }

  async processReturn(input: ProcessReturnInput): Promise<InvoiceWithLines> {
    const now = input.now ?? new Date();

    const originalInvoice = await this.deps.invoiceRepository.findByReference(
      input.parentReference,
    );

    if (!originalInvoice || originalInvoice.type !== "pos") {
      throw new InvoiceNotFoundError(input.parentReference);
    }

    if (originalInvoice.status === "voided") {
      throw new InvalidReturnError("Cannot return items from a voided invoice.");
    }

    const originalLineMap = new Map(
      originalInvoice.lines.map((l) => [l.skuId, l]),
    );

    for (const line of input.lines) {
      const originalLine = originalLineMap.get(line.skuId);
      if (!originalLine) {
        throw new InvalidReturnError(
          `SKU ${line.skuId} was not on the original invoice ${input.parentReference}.`,
          { skuId: line.skuId },
        );
      }
      if (line.quantity > originalLine.quantity) {
        throw new InvalidReturnError(
          `Cannot return more than the original quantity for SKU ${line.skuId}.`,
          { originalQuantity: originalLine.quantity, returnQuantity: line.quantity, skuId: line.skuId },
        );
      }
    }

    const creditReference =
      this.deps.referenceNumberService.generateCreditNoteReference(
        originalInvoice.reference,
      );

    const lines = input.lines.map((line) => {
      const originalLine = originalLineMap.get(line.skuId)!;
      const unitPrice = parseFloat(originalLine.unitPrice);
      const lineTotal = roundCurrency(unitPrice * line.quantity);

      return {
        lineTotal: lineTotal.toFixed(2),
        quantity: line.quantity,
        skuId: line.skuId,
        skuSnapshot: originalLine.skuSnapshot,
        taxAmount: "0.00",
        taxCategory: originalLine.taxCategory,
        taxRate: originalLine.taxRate,
        unitPrice: originalLine.unitPrice,
      };
    });

    const returnSubtotal = lines.reduce(
      (sum, l) => sum + parseFloat(l.lineTotal),
      0,
    );

    return this.deps.invoiceRepository.createReturnTransaction({
      attributedWorkerId: originalInvoice.attributedWorkerId,
      confirmedAt: now,
      createdBy: input.createdBy,
      lines,
      locationId: originalInvoice.locationId,
      now,
      parentInvoiceId: originalInvoice.id,
      reference: creditReference,
      subtotalAmount: returnSubtotal.toFixed(2),
      taxAmount: "0.00",
      totalAmount: returnSubtotal.toFixed(2),
      voidReason: input.reason,
    });
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
