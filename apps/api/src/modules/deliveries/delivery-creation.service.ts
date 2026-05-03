import type { DeliveryCreationCompose } from "./delivery-creation.compose.js";
import type {
  CreatedDelivery,
  CreateFromOnlineOrderInput,
  CreateFromPosSaleInput,
  CreateFromTransferInput,
  DeliveryCreationService,
} from "./delivery-creation.contracts.js";

export class DeliveryCreationServiceImpl implements DeliveryCreationService {
  constructor(private readonly compose: DeliveryCreationCompose) {}

  async createFromPosSale(
    input: CreateFromPosSaleInput,
  ): Promise<CreatedDelivery> {
    return this.compose.createFromPosSale(input);
  }

  async createFromOnlineOrder(
    input: CreateFromOnlineOrderInput,
  ): Promise<CreatedDelivery> {
    return this.compose.createFromOnlineOrder(input);
  }

  async createFromTransfer(
    input: CreateFromTransferInput,
  ): Promise<CreatedDelivery> {
    return this.compose.createFromTransfer(input);
  }
}
