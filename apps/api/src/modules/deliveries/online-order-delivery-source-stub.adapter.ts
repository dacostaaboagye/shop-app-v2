import type {
  DeliveryEligibleOnlineOrder,
  OnlineOrderDeliverySourcePort,
} from "@shop/contracts";

/**
 * E-14 (online checkout) is not yet built. This adapter ships as a
 * deliberate placeholder: every lookup returns null, which the service
 * surfaces as DeliverySourceNotFoundError. The real adapter will land
 * with E-14.
 *
 * The runtime logs a structured warning at startup if this stub is
 * wired in production.
 */
export class OnlineOrderDeliverySourceStubAdapter
  implements OnlineOrderDeliverySourcePort
{
  async findByOrderReference(
    _reference: string,
  ): Promise<DeliveryEligibleOnlineOrder | null> {
    return null;
  }
}
