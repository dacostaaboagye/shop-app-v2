import type {
  DeliveryEligiblePosSale,
  PosSaleDeliverySourcePort,
} from "@shop/contracts";

/**
 * Returns null until E-00C-01's follow-up commit wires the real adapter
 * against `apps/api/src/modules/sales/pos-sale.service.ts`. The service
 * surfaces null as DeliverySourceNotFoundError, so callers fail loudly
 * with a 404 until the real wiring lands.
 */
export class PosSaleDeliverySourceStubAdapter
  implements PosSaleDeliverySourcePort
{
  async findByInvoiceReference(
    _reference: string,
  ): Promise<DeliveryEligiblePosSale | null> {
    return null;
  }
}
