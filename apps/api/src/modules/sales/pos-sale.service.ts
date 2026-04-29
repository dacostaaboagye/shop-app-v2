import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import {
  type CreateReturnTransactionInput,
  type CreateSaleTransactionInput,
  InvalidReturnError,
  InvoiceNotFoundError,
  type InvoiceWithLines,
  MixedOwnershipSaleError,
  type PosCatalogVariantRepository,
  type SalesCurrencySnapshot,
  SaleVariantNotFoundError,
} from "./sales.contracts.js";
import type { SalesEventContextRepository } from "./sales-event-context.repository.js";
import { createSalesReturnProcessedEvent } from "./sales-return-events.js";

type PosSaleServiceDeps = {
  catalogVariantRepository: PosCatalogVariantRepository;
  currencyResolver: {
    resolveCurrencySnapshot: (input: {
      locationId: string;
    }) => Promise<SalesCurrencySnapshot>;
  };
  invoiceRepository: {
    createReturnTransaction: (
      input: CreateReturnTransactionInput,
    ) => Promise<InvoiceWithLines>;
    createSaleTransaction: (
      input: CreateSaleTransactionInput,
    ) => Promise<InvoiceWithLines>;
    findByReference: (reference: string) => Promise<InvoiceWithLines | null>;
  };
  referenceNumberService: Pick<
    ReferenceNumberService,
    "generateCreditNoteReference" | "generateReference"
  >;
  salesEventContextRepository?: SalesEventContextRepository;
  salesAttributionService: {
    attributeSale: (
      input: Parameters<SalesAttributionService["attributeSale"]>[0],
    ) => Promise<{ workerId: string }>;
  };
  platformEventPublisher?: PlatformEventPublisher | null;
};

type ProcessSaleInput = {
  createdBy: string;
  customerBillingAddressLines?: string[] | null;
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerTaxNumber?: string | null;
  lines: { quantity: number; skuId: string; unitPrice?: string }[];
  locationId: string;
  notes?: string;
  paymentMethod: "cash" | "card" | "mobile_money" | "transfer";
  now?: Date;
};

type ProcessReturnInput = {
  actor?: { userSlug: string };
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
    const currency = await this.deps.currencyResolver.resolveCurrencySnapshot({
      locationId: input.locationId,
    });

    const variantDetails =
      await this.deps.catalogVariantRepository.getVariantsForSale(
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
    const attributedWorkerId = workerIds.values().next().value;
    if (!attributedWorkerId) {
      throw new MixedOwnershipSaleError();
    }

    const reference = await this.deps.referenceNumberService.generateReference({
      now,
      sequenceKey: "invoice-pos",
    });

    const lineItems = input.lines.map((line) => {
      const variant = variantDetails.get(line.skuId);
      if (!variant) {
        throw new SaleVariantNotFoundError(line.skuId);
      }
      const customPrice =
        line.unitPrice !== undefined && line.unitPrice !== ""
          ? parseFloat(line.unitPrice)
          : NaN;
      const unitPrice =
        !Number.isNaN(customPrice) && customPrice >= 0
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
      classification: "outgoing",
      confirmedAt: now,
      createdBy: input.createdBy,
      customerBillingAddressLines: input.customerBillingAddressLines ?? null,
      currencyCode: currency.currencyCode,
      currencyScale: currency.currencyScale,
      customerEmail: input.customerEmail ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      customerTaxNumber: input.customerTaxNumber ?? null,
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

    const requestedInvoice = await this.deps.invoiceRepository.findByReference(
      input.parentReference,
    );

    if (!requestedInvoice || requestedInvoice.type === "credit_note") {
      throw new InvoiceNotFoundError(input.parentReference);
    }

    const originalInvoice = await this.resolveCurrentPayableInvoice(
      requestedInvoice,
    );

    if (originalInvoice.status === "voided") {
      throw new InvalidReturnError(
        "Cannot return items from a voided invoice.",
      );
    }

    if (originalInvoice.status === "superseded") {
      throw new InvalidReturnError(
        "Cannot return items from a superseded invoice revision.",
      );
    }

    const originalLineMap = new Map(
      originalInvoice.lines.map((l) => [l.skuId, l]),
    );
    const requestedReturnQuantities = aggregateReturnQuantities(input.lines);

    for (const [skuId, quantity] of requestedReturnQuantities) {
      const originalLine = originalLineMap.get(skuId);
      if (!originalLine) {
        throw new InvalidReturnError(
          `SKU ${skuId} was not on the original invoice ${input.parentReference}.`,
          { skuId },
        );
      }
      if (quantity > originalLine.quantity) {
        throw new InvalidReturnError(
          `Cannot return more than the original quantity for SKU ${skuId}.`,
          {
            originalQuantity: originalLine.quantity,
            returnQuantity: quantity,
            skuId,
          },
        );
      }
    }

    const creditReference =
      this.deps.referenceNumberService.generateCreditNoteReference(
        originalInvoice.reference,
      );

    const lines = Array.from(requestedReturnQuantities.entries()).map(
      ([skuId, quantity]) => {
        const originalLine = originalLineMap.get(skuId);
        if (!originalLine) {
          throw new InvalidReturnError(
            `SKU ${skuId} was not on the original invoice ${input.parentReference}.`,
            { skuId },
          );
        }
        const unitPrice = parseFloat(originalLine.unitPrice);
        const lineTotal = roundCurrency(unitPrice * quantity);
        const taxAmount = roundCurrency(
          parseFloat(originalLine.taxAmount) / originalLine.quantity,
        );

        return {
          lineTotal: lineTotal.toFixed(2),
          quantity,
          skuId,
          skuSnapshot: originalLine.skuSnapshot,
          taxAmount: roundCurrency(taxAmount * quantity).toFixed(2),
          taxCategory: originalLine.taxCategory,
          taxRate: originalLine.taxRate,
          unitPrice: originalLine.unitPrice,
        };
      },
    );

    const adjustedLines = originalInvoice.lines
      .map((line) => {
        const returnQuantity = requestedReturnQuantities.get(line.skuId) ?? 0;
        const remainingQuantity = line.quantity - returnQuantity;

        if (remainingQuantity <= 0) return null;

        const unitPrice = parseFloat(line.unitPrice);
        const taxPerUnit = parseFloat(line.taxAmount) / line.quantity;

        return {
          lineTotal: roundCurrency(unitPrice * remainingQuantity).toFixed(2),
          quantity: remainingQuantity,
          skuId: line.skuId,
          skuSnapshot: line.skuSnapshot,
          taxAmount: roundCurrency(taxPerUnit * remainingQuantity).toFixed(2),
          taxCategory: line.taxCategory,
          taxRate: line.taxRate,
          unitPrice: line.unitPrice,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

    const adjustedSubtotal = adjustedLines.reduce(
      (sum, line) => sum + parseFloat(line.lineTotal),
      0,
    );
    const adjustedTaxAmount = adjustedLines.reduce(
      (sum, line) => sum + parseFloat(line.taxAmount),
      0,
    );
    const hasAdjustedInvoice = adjustedLines.length > 0;
    const adjustedReference = hasAdjustedInvoice
      ? await this.deps.referenceNumberService.generateReference({
          now,
          sequenceKey: "invoice-pos",
        })
      : null;

    const returnSubtotal = lines.reduce(
      (sum, l) => sum + parseFloat(l.lineTotal),
      0,
    );
    const returnTaxAmount = lines.reduce(
      (sum, l) => sum + parseFloat(l.taxAmount),
      0,
    );

    const creditNote = await this.deps.invoiceRepository.createReturnTransaction(
      {
        adjustedInvoice:
          hasAdjustedInvoice && adjustedReference
            ? {
                lines: adjustedLines,
                reference: adjustedReference,
                subtotalAmount: adjustedSubtotal.toFixed(2),
                taxAmount: adjustedTaxAmount.toFixed(2),
                totalAmount: roundCurrency(
                  adjustedSubtotal + adjustedTaxAmount,
                ).toFixed(2),
              }
            : null,
        attributedWorkerId: originalInvoice.attributedWorkerId,
        classification: originalInvoice.classification,
        confirmedAt: now,
        createdBy: input.createdBy,
        currencyCode: originalInvoice.currencyCode,
        currencyScale: originalInvoice.currencyScale,
        lines,
        locationId: originalInvoice.locationId,
        now,
        parentInvoiceId: originalInvoice.id,
        reference: creditReference,
        revisionRootInvoiceId:
          originalInvoice.revisionRootInvoiceId ?? originalInvoice.id,
        subtotalAmount: returnSubtotal.toFixed(2),
        taxAmount: returnTaxAmount.toFixed(2),
        totalAmount: roundCurrency(returnSubtotal + returnTaxAmount).toFixed(2),
        voidReason: input.reason,
      },
    );

    if (input.actor && this.deps.platformEventPublisher) {
      const locationName =
        await this.deps.salesEventContextRepository?.getLocationName(
          creditNote.locationId,
        );

      await this.deps.platformEventPublisher.publish(
        createSalesReturnProcessedEvent({
          actor: input.actor,
          creditNote,
          locationName: locationName ?? creditNote.locationId,
          occurredAt: now,
          parentInvoice: originalInvoice,
          reason: input.reason,
        }),
      );
    }

    return creditNote;
  }

  private async resolveCurrentPayableInvoice(
    invoice: InvoiceWithLines,
  ): Promise<InvoiceWithLines> {
    const currentPayableReference = invoice.currentPayableReference;

    if (
      currentPayableReference &&
      currentPayableReference !== invoice.reference
    ) {
      const currentPayableInvoice =
        await this.deps.invoiceRepository.findByReference(
          currentPayableReference,
        );

      if (!currentPayableInvoice) {
        throw new InvalidReturnError(
          "The latest payable invoice revision could not be resolved.",
          {
            currentPayableReference,
            reference: invoice.reference,
          },
        );
      }

      return currentPayableInvoice;
    }

    let currentInvoice = invoice;
    const seenReferences = new Set<string>();

    while (currentInvoice.replacementInvoiceReference) {
      if (seenReferences.has(currentInvoice.reference)) {
        throw new InvalidReturnError(
          "Invoice revision chain contains a cycle and cannot be processed.",
          { reference: currentInvoice.reference },
        );
      }

      seenReferences.add(currentInvoice.reference);

      const replacementInvoice =
        await this.deps.invoiceRepository.findByReference(
          currentInvoice.replacementInvoiceReference,
        );

      if (!replacementInvoice) {
        throw new InvalidReturnError(
          "The latest payable invoice revision could not be resolved.",
          {
            reference: currentInvoice.reference,
            replacementReference: currentInvoice.replacementInvoiceReference,
          },
        );
      }

      currentInvoice = replacementInvoice;
    }

    return currentInvoice;
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function aggregateReturnQuantities(
  lines: ProcessReturnInput["lines"],
): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const line of lines) {
    quantities.set(line.skuId, (quantities.get(line.skuId) ?? 0) + line.quantity);
  }

  return quantities;
}
