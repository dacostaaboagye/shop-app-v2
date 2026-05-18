import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { InvoiceIssuanceService } from "./invoice-issuance.service.js";
import {
  aggregateReturnQuantities,
  buildAdjustedInvoiceLines,
  buildReturnInvoiceLines,
  resolveAttributedWorkerId,
  resolveCurrentPayableInvoice,
  roundCurrency,
  validateReturnQuantities,
} from "./pos-sale.service.support.js";
import {
  type CreateReturnTransactionInput,
  type CreateSaleTransactionInput,
  InvalidReturnError,
  InvoiceNotFoundError,
  type InvoiceWithLines,
} from "./sales.contracts.js";
import type { SalesEventContextRepository } from "./sales-event-context.repository.js";
import { createSalesReturnProcessedEvent } from "./sales-return-events.js";

type PosSaleServiceDeps = {
  invoiceIssuanceService: Pick<InvoiceIssuanceService, "prepareInvoice">;
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
    const attributions = await Promise.all(
      input.lines.map((line) =>
        this.deps.salesAttributionService.attributeSale({
          locationId: input.locationId,
          skuId: line.skuId,
          soldAt: now,
        }),
      ),
    );
    const attributedWorkerId = resolveAttributedWorkerId(attributions);

    const transactionInput =
      await this.deps.invoiceIssuanceService.prepareInvoice({
        attributedWorkerId,
        channel: "pos",
        classification: "outgoing",
        createdBy: input.createdBy,
        customer: {
          billingAddressLines: input.customerBillingAddressLines ?? null,
          email: input.customerEmail ?? null,
          name: input.customerName ?? null,
          phone: input.customerPhone ?? null,
          taxNumber: input.customerTaxNumber ?? null,
        },
        lines: input.lines,
        locationId: input.locationId,
        notes: input.notes ?? null,
        now,
        settlement: { paymentMethod: input.paymentMethod },
      });

    return this.deps.invoiceRepository.createSaleTransaction({
      ...transactionInput,
      attributedWorkerId,
      paymentMethod: input.paymentMethod,
    });
  }

  async processReturn(input: ProcessReturnInput): Promise<InvoiceWithLines> {
    const now = input.now ?? new Date();

    const requestedInvoice = await this.deps.invoiceRepository.findByReference(
      input.parentReference,
    );

    if (!requestedInvoice || requestedInvoice.type === "credit_note") {
      throw new InvoiceNotFoundError(input.parentReference);
    }

    const originalInvoice = await resolveCurrentPayableInvoice({
      findByReference: this.deps.invoiceRepository.findByReference,
      invoice: requestedInvoice,
    });

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

    const requestedReturnQuantities = aggregateReturnQuantities(input.lines);
    const originalLineMap = validateReturnQuantities({
      originalInvoice,
      parentReference: input.parentReference,
      requestedReturnQuantities,
    });

    const creditReference =
      this.deps.referenceNumberService.generateCreditNoteReference(
        originalInvoice.reference,
      );

    const lines = buildReturnInvoiceLines({
      originalLineMap,
      parentReference: input.parentReference,
      requestedReturnQuantities,
    });
    const adjustedLines = buildAdjustedInvoiceLines({
      originalInvoice,
      requestedReturnQuantities,
    });

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

    const creditNote =
      await this.deps.invoiceRepository.createReturnTransaction({
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
      });

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
}
