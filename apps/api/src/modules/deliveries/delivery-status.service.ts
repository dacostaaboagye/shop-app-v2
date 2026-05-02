import type { DeliveryStatusCompose } from "./delivery-status.compose.js";
import type {
  AssignDeliveryInput,
  CancelDeliveryInput,
  CompleteDeliveryInput,
  DeliveryStatusService,
  DeliveryTransitionResult,
  DispatchDeliveryInput,
} from "./delivery-status.contracts.js";

export class DeliveryStatusServiceImpl implements DeliveryStatusService {
  constructor(private readonly compose: DeliveryStatusCompose) {}

  async assign(input: AssignDeliveryInput): Promise<DeliveryTransitionResult> {
    return this.compose.assign(input);
  }

  async dispatch(
    input: DispatchDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.compose.dispatch(input);
  }

  async complete(
    input: CompleteDeliveryInput,
  ): Promise<DeliveryTransitionResult> {
    return this.compose.complete(input);
  }

  async cancel(input: CancelDeliveryInput): Promise<DeliveryTransitionResult> {
    return this.compose.cancel(input);
  }
}
