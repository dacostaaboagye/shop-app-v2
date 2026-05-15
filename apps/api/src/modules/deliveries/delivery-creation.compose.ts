import type {
  DeliverySourceType,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  CreatedDelivery,
  CreateFromOnlineOrderInput,
  CreateFromPosSaleInput,
  CreateFromTransferInput,
  DeliveryCreationStockSideEffectsPort,
} from "./delivery-creation.contracts.js";
import {
  applyDeliveryCreationStockSideEffectsOrThrow,
  assertPositiveIntegerSourceQuantities,
  isDeliveryItemReferenceUniqueViolation,
  isDeliverySourceUniqueViolation,
  verifySourceMatch,
} from "./delivery-creation.support.js";
import {
  buildOnlineOrderComposeInput,
  buildPosSaleComposeInput,
  buildTransferComposeInput,
  type ComposeInput,
} from "./delivery-creation-input-builder.js";
import { insertDeliveryItems } from "./delivery-creation-item-writer.js";
import {
  DeliveryPartialFulfillmentUnsupportedError,
  DeliverySourceNotFoundError,
} from "./delivery-errors.js";
import { findExistingDeliveryBySource } from "./delivery-existing-source-reader.js";
import { loadDeliveryRecordById } from "./delivery-record-hydration.js";
import { createPostgresDeliveryWriteTransaction } from "./postgres-delivery-write.repository.js";

const MAX_ITEM_REFERENCE_COMPOSE_ATTEMPTS = 3;

export type ComposeDeliveryDeps = {
  db: ApiDatabase;
  posSaleSourcePort: PosSaleDeliverySourcePort;
  onlineOrderSourcePort: OnlineOrderDeliverySourcePort;
  transferSourcePort: TransferDeliverySourcePort;
  stockSideEffectsPort: DeliveryCreationStockSideEffectsPort;
  referenceNumberService: ReferenceNumberService;
};

export class DeliveryCreationCompose {
  constructor(private readonly deps: ComposeDeliveryDeps) {}

  async createFromPosSale(
    input: CreateFromPosSaleInput,
  ): Promise<CreatedDelivery> {
    const existing = await this.findExisting(
      "pos_sale",
      input.invoiceReference,
    );
    if (existing) return existing;

    const sale = await this.deps.posSaleSourcePort.findByInvoiceReference(
      input.invoiceReference,
    );
    if (!sale) {
      throw new DeliverySourceNotFoundError({
        sourceType: "pos_sale",
        sourceReference: input.invoiceReference,
      });
    }
    return this.composeWithRetry(buildPosSaleComposeInput(input, sale));
  }

  async createFromOnlineOrder(
    input: CreateFromOnlineOrderInput,
  ): Promise<CreatedDelivery> {
    const existing = await this.findExisting(
      "online_order",
      input.orderReference,
    );
    if (existing) return existing;

    const order = await this.deps.onlineOrderSourcePort.findByOrderReference(
      input.orderReference,
    );
    if (!order) {
      throw new DeliverySourceNotFoundError({
        sourceType: "online_order",
        sourceReference: input.orderReference,
      });
    }
    return this.composeWithRetry(buildOnlineOrderComposeInput(input, order));
  }

  async createFromTransfer(
    input: CreateFromTransferInput,
  ): Promise<CreatedDelivery> {
    const existing = await this.findExisting(
      "transfer",
      input.transferReference,
    );
    if (existing) return existing;

    const transfer = await this.deps.transferSourcePort.findByTransferReference(
      input.transferReference,
    );
    if (!transfer) {
      throw new DeliverySourceNotFoundError({
        sourceType: "transfer",
        sourceReference: input.transferReference,
      });
    }
    return this.composeWithRetry(buildTransferComposeInput(input, transfer));
  }

  private async composeWithRetry(
    input: ComposeInput,
  ): Promise<CreatedDelivery> {
    if (input.items.length === 0) {
      throw new DeliveryPartialFulfillmentUnsupportedError({
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      });
    }
    assertPositiveIntegerSourceQuantities(input);

    for (
      let attempt = 1;
      attempt <= MAX_ITEM_REFERENCE_COMPOSE_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.composeOnce(input);
      } catch (error) {
        if (isDeliverySourceUniqueViolation(error)) {
          return this.composeOnce(input);
        }
        if (
          attempt < MAX_ITEM_REFERENCE_COMPOSE_ATTEMPTS &&
          isDeliveryItemReferenceUniqueViolation(error)
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Delivery creation retry loop exhausted.");
  }

  private async composeOnce(input: ComposeInput): Promise<CreatedDelivery> {
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

      const reference =
        await this.deps.referenceNumberService.generateReference({
          now,
          sequenceKey: "delivery",
        });
      const delivery = await writeTx.insertDelivery({
        reference,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        originLocationId: input.originLocationId,
        destination: input.destination,
        createdBy: input.createdBy,
        createdAt: now,
      });

      const items = await insertDeliveryItems({
        createdAt: now,
        deliveryId: delivery.deliveryId,
        referenceNumberService: this.deps.referenceNumberService,
        sourceItems: input.items,
        writeTx,
      });

      await applyDeliveryCreationStockSideEffectsOrThrow(
        this.deps.stockSideEffectsPort,
        {
          tx,
          createdBy: input.createdBy,
          items,
          now,
          originLocationId: input.originLocationId,
          sourceReference: input.sourceReference,
          sourceType: input.sourceType,
          ...(input.transferContext
            ? { transferContext: input.transferContext }
            : {}),
        },
      );

      const hydratedDelivery = await loadDeliveryRecordById(
        tx,
        delivery.deliveryId,
      );
      if (!hydratedDelivery) {
        throw new Error("Failed to reload created delivery.");
      }

      return {
        delivery: hydratedDelivery,
        status: "created" as const,
      };
    });
  }

  private async findExisting(
    sourceType: DeliverySourceType,
    sourceReference: string,
  ): Promise<CreatedDelivery | null> {
    const delivery = await findExistingDeliveryBySource(this.deps.db, {
      sourceType,
      sourceReference,
    });
    return delivery ? { delivery, status: "noop" } : null;
  }
}
