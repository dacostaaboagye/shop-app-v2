import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insertDeliveryItems } from "../src/modules/deliveries/delivery-creation-item-writer.js";

describe("insertDeliveryItems", () => {
  it("propagates item reference collisions so the outer transaction can retry", async () => {
    const attemptedReferences: string[] = [];
    const writeTx = {
      async insertDeliveryItem(input: {
        itemReference: string;
        quantity: number;
        skuId: string;
      }) {
        attemptedReferences.push(input.itemReference);
        if (input.itemReference === "DLI-COLLISION") {
          throw Object.assign(new Error("duplicate item reference"), {
            code: "23505",
            constraint: "delivery_items_reference_unique",
          });
        }
        return {
          deliveryItemId: "22222222-2222-4222-8222-222222222222",
          itemReference: input.itemReference,
          quantity: input.quantity,
          skuId: input.skuId,
        };
      },
    };

    await assert.rejects(
      () =>
        insertDeliveryItems({
          createdAt: new Date("2026-05-01T00:00:00.000Z"),
          deliveryId: "11111111-1111-4111-8111-111111111111",
          referenceNumberService: {
            async generateReference() {
              return "DLI-COLLISION";
            },
          } as never,
          sourceItems: [
            {
              quantity: 1,
              skuId: "33333333-3333-4333-8333-333333333333",
            },
          ],
          writeTx: writeTx as never,
        }),
      {
        message: "duplicate item reference",
      },
    );

    assert.deepEqual(attemptedReferences, ["DLI-COLLISION"]);
  });
});
