import type {
  DeliveryAddressSnapshot,
  DeliveryEligibleSourceItem,
  DeliverySourceType,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  DeliveryDestinationRecord,
  DeliveryItemRecord,
} from "./delivery.types.js";
import type {
  CreatedDelivery,
  CreateFromOnlineOrderInput,
  CreateFromPosSaleInput,
  CreateFromTransferInput,
} from "./delivery-creation.contracts.js";
import {
  isDeliverySourceUniqueViolation,
  verifySourceMatch,
} from "./delivery-creation.support.js";
import {
  DeliveryInvalidDestinationError,
  DeliveryPartialFulfillmentUnsupportedError,
  DeliverySourceNotFoundError,
  DeliverySourceStateInvalidError,
} from "./delivery-errors.js";
import {
  isOnlineOrderEligibleForDelivery,
  isPosSaleEligibleForDelivery,
  isTransferEligibleForDelivery,
} from "./delivery-source.policy.js";
import { createPostgresDeliveryWriteTransaction } from "./postgres-delivery-write.repository.js";

export type ComposeDeliveryDeps = {
  db: ApiDatabase;
  posSaleSourcePort: PosSaleDeliverySourcePort;
  onlineOrderSourcePort: OnlineOrderDeliverySourcePort;
  transferSourcePort: TransferDeliverySourcePort;
  referenceNumberService: ReferenceNumberService;
};

export class DeliveryCreationCompose {
  constructor(private readonly deps: ComposeDeliveryDeps) {}

  async createFromPosSale(
    input: CreateFromPosSaleInput,
  ): Promise<CreatedDelivery> {
    const sale = await this.deps.posSaleSourcePort.findByInvoiceReference(
      input.invoiceReference,
    );
    if (!sale) {
      throw new DeliverySourceNotFoundError({
        sourceType: "pos_sale",
        sourceReference: input.invoiceReference,
      });
    }
    const eligibility = isPosSaleEligibleForDelivery(sale);
    if (!eligibility.eligible) {
      throw new DeliverySourceStateInvalidError({
        sourceType: "pos_sale",
        sourceReference: input.invoiceReference,
        state: eligibility.state,
      });
    }
    return this.composeWithRetry({
      sourceType: "pos_sale",
      sourceReference: input.invoiceReference,
      originLocationId: sale.locationId,
      destination: this.requireExternalDestination(
        "pos_sale",
        input.destination,
      ),
      items: sale.items,
      createdBy: input.createdBy,
      now: input.now,
    });
  }

  async createFromOnlineOrder(
    input: CreateFromOnlineOrderInput,
  ): Promise<CreatedDelivery> {
    const order = await this.deps.onlineOrderSourcePort.findByOrderReference(
      input.orderReference,
    );
    if (!order) {
      throw new DeliverySourceNotFoundError({
        sourceType: "online_order",
        sourceReference: input.orderReference,
      });
    }
    const eligibility = isOnlineOrderEligibleForDelivery(order);
    if (!eligibility.eligible) {
      throw new DeliverySourceStateInvalidError({
        sourceType: "online_order",
        sourceReference: input.orderReference,
        state: eligibility.state,
      });
    }
    return this.composeWithRetry({
      sourceType: "online_order",
      sourceReference: input.orderReference,
      originLocationId: order.locationId,
      destination: this.requireExternalDestination(
        "online_order",
        input.destination,
      ),
      items: order.items,
      createdBy: input.createdBy,
      now: input.now,
    });
  }

  async createFromTransfer(
    input: CreateFromTransferInput,
  ): Promise<CreatedDelivery> {
    const transfer = await this.deps.transferSourcePort.findByTransferReference(
      input.transferReference,
    );
    if (!transfer) {
      throw new DeliverySourceNotFoundError({
        sourceType: "transfer",
        sourceReference: input.transferReference,
      });
    }
    const eligibility = isTransferEligibleForDelivery(transfer);
    if (!eligibility.eligible) {
      throw new DeliverySourceStateInvalidError({
        sourceType: "transfer",
        sourceReference: input.transferReference,
        state: eligibility.state,
      });
    }
    if (transfer.sourceLocationId === transfer.destinationLocationId) {
      throw new DeliveryInvalidDestinationError({
        sourceType: "transfer",
        reason: "Transfer origin and destination must be different locations.",
      });
    }
    return this.composeWithRetry({
      sourceType: "transfer",
      sourceReference: input.transferReference,
      originLocationId: transfer.sourceLocationId,
      destination: {
        kind: "location",
        locationId: transfer.destinationLocationId,
      },
      items: transfer.items,
      createdBy: input.createdBy,
      now: input.now,
    });
  }

  private requireExternalDestination(
    sourceType: DeliverySourceType,
    destination: DeliveryAddressSnapshot,
  ): DeliveryDestinationRecord {
    if (!destination) {
      throw new DeliveryInvalidDestinationError({
        sourceType,
        reason: `${sourceType} requires an external destination snapshot.`,
      });
    }
    return { kind: "external", snapshot: destination };
  }

  private async composeWithRetry(input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
    originLocationId: string;
    destination: DeliveryDestinationRecord;
    items: DeliveryEligibleSourceItem[];
    createdBy: string;
    now: Date | undefined;
  }): Promise<CreatedDelivery> {
    if (input.items.length === 0) {
      throw new DeliveryPartialFulfillmentUnsupportedError({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      });
    }

    try {
      return await this.composeOnce(input);
    } catch (error) {
      if (isDeliverySourceUniqueViolation(error)) {
        return this.composeOnce({ ...input, retry: true });
      }
      throw error;
    }
  }

  private async composeOnce(input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
    originLocationId: string;
    destination: DeliveryDestinationRecord;
    items: DeliveryEligibleSourceItem[];
    createdBy: string;
    now: Date | undefined;
    retry?: boolean;
  }): Promise<CreatedDelivery> {
    const now = input.now ?? new Date();

    return this.deps.db.transaction(async (tx) => {
      const writeTx = createPostgresDeliveryWriteTransaction(tx);

      const existing = await writeTx.findExistingBySource({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      });
      if (existing) {
        verifySourceMatch(existing, input);
        return { delivery: existing, status: "noop" } as const;
      }

      const itemReferences = await Promise.all(
        input.items.map(() =>
          this.deps.referenceNumberService.generateReference({
            sequenceKey: "delivery-item",
            now,
          }),
        ),
      );

      const delivery = await writeTx.insertDelivery({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        originLocationId: input.originLocationId,
        destination: input.destination,
        createdBy: input.createdBy,
        createdAt: now,
      });

      const items: DeliveryItemRecord[] = [];
      for (const [index, sourceItem] of input.items.entries()) {
        const itemReference = itemReferences[index];
        if (!itemReference) {
          throw new Error("Reference minting returned an empty value.");
        }
        const item = await writeTx.insertDeliveryItem({
          deliveryId: delivery.deliveryId,
          skuId: sourceItem.skuId,
          quantity: sourceItem.quantity,
          itemReference,
          createdAt: now,
        });
        items.push(item);
      }

      // TODO(e-00c-01): wire the stock-module side effects via
      // createPostgresStockReservationTransaction(tx) once the real upstream
      // adapters land. For online_order: reserve at origin. For transfer:
      // adjust onHand -> reserved at origin and reject if shortfall via
      // DeliveryInsufficientOriginStockError. The compose helper already
      // owns the tx, so the stock tx will participate in the same
      // atomic boundary.

      return {
        delivery: { ...delivery, items },
        status: "created" as const,
      };
    });
  }
}
