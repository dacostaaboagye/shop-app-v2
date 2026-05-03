import type { DeliveryAgentEligibilityPort } from "@shop/contracts";

/**
 * Stub eligibility check that returns true for any user. Real
 * implementation will query the access-control module to confirm the
 * user holds an "agent" role at the origin location. Tracked as part
 * of E-00C-03 follow-up.
 */
export class DeliveryAgentEligibilityStubAdapter
  implements DeliveryAgentEligibilityPort
{
  async isEligibleAgent(): Promise<boolean> {
    return true;
  }
}
