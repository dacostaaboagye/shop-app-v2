import type { DeliveryEligibleSourceItem } from "@shop/contracts";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { DeliveryItemRecord } from "./delivery.types.js";
import type { createPostgresDeliveryWriteTransaction } from "./postgres-delivery-write.repository.js";

type DeliveryWriteTransaction = ReturnType<
  typeof createPostgresDeliveryWriteTransaction
>;

export async function insertDeliveryItems(input: {
  createdAt: Date;
  deliveryId: string;
  referenceNumberService: ReferenceNumberService;
  sourceItems: DeliveryEligibleSourceItem[];
  writeTx: DeliveryWriteTransaction;
}): Promise<DeliveryItemRecord[]> {
  const items: DeliveryItemRecord[] = [];
  for (const sourceItem of input.sourceItems) {
    const itemReference = await input.referenceNumberService.generateReference({
      sequenceKey: "delivery-item",
      now: input.createdAt,
    });
    if (!itemReference) {
      throw new Error("Reference minting returned an empty value.");
    }

    items.push(
      await input.writeTx.insertDeliveryItem({
        deliveryId: input.deliveryId,
        skuId: sourceItem.skuId,
        quantity: sourceItem.quantity,
        itemReference,
        createdAt: input.createdAt,
      }),
    );
  }

  return items;
}
