import type {
  DeliveryEligiblePosSale,
  PosSaleDeliverySourcePort,
} from "@shop/contracts";
import type { InvoiceWithLines } from "./sales.contracts.js";

type PosSaleInvoiceLookup = {
  findByReference(reference: string): Promise<InvoiceWithLines | null>;
};

export class PosSaleDeliverySourceAdapter implements PosSaleDeliverySourcePort {
  constructor(private readonly invoices: PosSaleInvoiceLookup) {}

  async findByInvoiceReference(
    reference: string,
  ): Promise<DeliveryEligiblePosSale | null> {
    const invoice = await this.invoices.findByReference(reference);
    if (!invoice || invoice.type !== "pos") {
      return null;
    }

    return {
      invoiceReference: invoice.reference,
      locationId: invoice.locationId,
      state: invoice.status,
      items: invoice.lines.map((line) => ({
        skuId: line.skuId,
        quantity: line.quantity,
      })),
      customer: {
        name: invoice.customerName,
        phone: invoice.customerPhone,
        email: invoice.customerEmail,
      },
    };
  }
}
