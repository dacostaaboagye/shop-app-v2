import { AppError } from "../_core/errors/app-error.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { InvoiceIssuanceLineRequest } from "./invoice-issuance.contracts.js";
import type {
  CreateManualInvoiceRequestInput,
  ManualInvoiceRequestRecord,
  ManualInvoiceRequestRepository,
} from "./manual-invoice-request.types.js";
import {
  buildSaleLineItems,
  roundCurrency,
} from "./pos-sale.service.support.js";
import type {
  InvoiceWithLines,
  PosCatalogVariantRepository,
  SalesCurrencySnapshot,
} from "./sales.contracts.js";

type ManualInvoiceRequestServiceDeps = {
  catalogVariantRepository: PosCatalogVariantRepository;
  currencyResolver: {
    resolveCurrencySnapshot: (input: {
      locationId: string;
    }) => Promise<SalesCurrencySnapshot>;
  };
  referenceNumberService: Pick<ReferenceNumberService, "generateReference">;
  repository: ManualInvoiceRequestRepository;
};

export class ManualInvoiceRequestService {
  constructor(private readonly deps: ManualInvoiceRequestServiceDeps) {}

  async createRequest(
    input: CreateManualInvoiceRequestInput,
  ): Promise<ManualInvoiceRequestRecord> {
    const now = new Date();
    const reference = await this.deps.referenceNumberService.generateReference({
      now,
      sequenceKey: "manual-invoice-request",
    });
    const currency = await this.deps.currencyResolver.resolveCurrencySnapshot({
      locationId: input.locationId,
    });
    const lineItems = await this.prepareLineItems(
      input.lines,
      input.locationId,
    );
    const totals = calculateTotals(lineItems);

    return this.deps.repository.createRequestTransaction({
      createdBy: input.createdBy,
      customerBillingAddressLines: input.customerBillingAddressLines ?? null,
      customerEmail: input.customerEmail ?? null,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      customerTaxNumber: input.customerTaxNumber ?? null,
      currencyCode: currency.currencyCode,
      currencyScale: currency.currencyScale,
      lineItems,
      locationId: input.locationId,
      now,
      paymentMethod: input.paymentMethod ?? null,
      reason: input.reason,
      reference,
      subtotalAmount: totals.subtotalAmount,
      supportingNote: input.supportingNote ?? null,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
    });
  }

  async approveRequest(input: {
    actorUserId: string;
    note?: string | null;
    reference: string;
  }): Promise<{
    invoice: InvoiceWithLines;
    request: ManualInvoiceRequestRecord;
  }> {
    const now = new Date();
    const request = await this.getRequestOrThrow(input.reference);
    if (request.status !== "pending") throw requestStateError();
    if (request.requestedBy === input.actorUserId) throw selfApprovalError();

    const invoiceReference =
      await this.deps.referenceNumberService.generateReference({
        now,
        sequenceKey: "invoice-manual",
      });

    return this.deps.repository.approveRequestTransaction({
      approvedBy: input.actorUserId,
      invoice: {
        attributedWorkerId: null,
        channel: "manual",
        classification: "outgoing",
        confirmedAt: now,
        createdBy: input.actorUserId,
        customerBillingAddressLines: request.customerBillingAddressLines,
        currencyCode: request.currencyCode,
        currencyScale: request.currencyScale,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerTaxNumber: request.customerTaxNumber,
        lineItems: request.lines.map((line) => ({
          ...line,
          locationId: request.locationId,
        })),
        locationId: request.locationId,
        notes: request.supportingNote ?? request.reason,
        now,
        paymentMethod: request.paymentMethod,
        reference: invoiceReference,
        subtotalAmount: request.subtotalAmount,
        taxAmount: request.taxAmount,
        totalAmount: request.totalAmount,
      },
      note: input.note ?? null,
      now,
      requestId: request.id,
    });
  }

  async rejectRequest(input: {
    actorUserId: string;
    reason: string;
    reference: string;
  }): Promise<ManualInvoiceRequestRecord> {
    const request = await this.getRequestOrThrow(input.reference);
    if (request.status !== "pending") throw requestStateError();

    return this.deps.repository.rejectRequestTransaction({
      actorId: input.actorUserId,
      now: new Date(),
      reason: input.reason,
      requestId: request.id,
    });
  }

  async getRequestOrThrow(
    reference: string,
  ): Promise<ManualInvoiceRequestRecord> {
    const request = await this.deps.repository.findByReference(reference);
    if (!request) throw requestNotFoundError(reference);
    return request;
  }

  private async prepareLineItems(
    lines: InvoiceIssuanceLineRequest[],
    locationId: string,
  ) {
    const variantDetails =
      await this.deps.catalogVariantRepository.getVariantsForSale(
        lines.map((line) => line.skuId),
      );

    return buildSaleLineItems({ lines, locationId, variantDetails });
  }
}

function calculateTotals(
  lineItems: Array<{ lineTotal: string; taxAmount: string }>,
) {
  const subtotal = lineItems.reduce(
    (sum, line) => sum + parseFloat(line.lineTotal),
    0,
  );
  const tax = lineItems.reduce(
    (sum, line) => sum + parseFloat(line.taxAmount),
    0,
  );

  return {
    subtotalAmount: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    totalAmount: roundCurrency(subtotal + tax).toFixed(2),
  };
}

function requestNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Manual invoice request ${reference} does not exist.`,
    statusCode: 404,
    title: "Manual invoice request not found",
  });
}

function requestStateError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "Only pending manual invoice requests can be changed.",
    statusCode: 409,
    title: "Manual invoice request is not pending",
  });
}

function selfApprovalError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "Manual invoice requests must be approved by another user.",
    statusCode: 403,
    title: "Self approval is not allowed",
  });
}
