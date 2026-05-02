import type {
  DeliveryEligibleTransfer,
  TransferDeliverySourcePort,
} from "@shop/contracts";

/**
 * Returns null until E-00C-01's follow-up commit wires the real adapter
 * against the stock-transfers module. The service surfaces null as
 * DeliverySourceNotFoundError, so callers fail loudly with a 404 until
 * the real wiring lands.
 */
export class TransferDeliverySourceStubAdapter
  implements TransferDeliverySourcePort
{
  async findByTransferReference(
    _reference: string,
  ): Promise<DeliveryEligibleTransfer | null> {
    return null;
  }
}
