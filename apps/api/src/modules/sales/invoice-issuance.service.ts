import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  CreateIssuedInvoiceTransactionInput,
  IssuedInvoiceRepository,
  PrepareInvoiceInput,
} from "./invoice-issuance.contracts.js";
import { invoiceSequenceByChannel } from "./invoice-issuance.contracts.js";
import {
  buildSaleLineItems,
  roundCurrency,
} from "./pos-sale.service.support.js";
import type {
  InvoiceWithLines,
  PosCatalogVariantRepository,
  SalesCurrencySnapshot,
} from "./sales.contracts.js";

type InvoiceIssuanceServiceDeps = {
  catalogVariantRepository: PosCatalogVariantRepository;
  currencyResolver: {
    resolveCurrencySnapshot: (input: {
      locationId: string;
    }) => Promise<SalesCurrencySnapshot>;
  };
  invoiceRepository?: IssuedInvoiceRepository;
  referenceNumberService: Pick<ReferenceNumberService, "generateReference">;
};

export class InvoiceIssuanceService {
  constructor(private readonly deps: InvoiceIssuanceServiceDeps) {}

  async prepareInvoice(
    input: PrepareInvoiceInput,
  ): Promise<CreateIssuedInvoiceTransactionInput> {
    const now = input.now ?? new Date();
    const currency = await this.deps.currencyResolver.resolveCurrencySnapshot({
      locationId: input.locationId,
    });
    const variantDetails =
      await this.deps.catalogVariantRepository.getVariantsForSale(
        input.lines.map((line) => line.skuId),
      );
    const reference = await this.deps.referenceNumberService.generateReference({
      now,
      sequenceKey: invoiceSequenceByChannel[input.channel],
    });
    const lineItems = buildSaleLineItems({
      lines: input.lines,
      locationId: input.locationId,
      variantDetails,
    });
    const subtotalAmount = lineItems.reduce(
      (sum, line) => sum + parseFloat(line.lineTotal),
      0,
    );
    const taxAmount = lineItems.reduce(
      (sum, line) => sum + parseFloat(line.taxAmount),
      0,
    );
    const totalAmount = roundCurrency(subtotalAmount + taxAmount);
    const customer = input.customer ?? {};

    return {
      attributedWorkerId: input.attributedWorkerId,
      channel: input.channel,
      classification: input.classification,
      confirmedAt: now,
      createdBy: input.createdBy,
      customerBillingAddressLines: customer.billingAddressLines ?? null,
      currencyCode: currency.currencyCode,
      currencyScale: currency.currencyScale,
      customerEmail: customer.email ?? null,
      customerName: customer.name ?? null,
      customerPhone: customer.phone ?? null,
      customerTaxNumber: customer.taxNumber ?? null,
      lineItems,
      locationId: input.locationId,
      notes: input.notes ?? null,
      now,
      paymentMethod: input.settlement?.paymentMethod ?? null,
      reference,
      subtotalAmount: subtotalAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  }

  async issueInvoice(input: PrepareInvoiceInput): Promise<InvoiceWithLines> {
    if (!this.deps.invoiceRepository) {
      throw new Error("Invoice issuance repository is not configured.");
    }

    return this.deps.invoiceRepository.createIssuedInvoiceTransaction(
      await this.prepareInvoice(input),
    );
  }
}
