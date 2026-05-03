import type { DeliverySourceType } from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { DeliveryRecord } from "./delivery.types.js";
import { createPostgresDeliveryWriteTransaction } from "./postgres-delivery-write.repository.js";

export async function findExistingDeliveryBySource(
  db: ApiDatabase,
  input: {
    sourceType: DeliverySourceType;
    sourceReference: string;
  },
): Promise<DeliveryRecord | null> {
  return db.transaction(async (tx) => {
    return createPostgresDeliveryWriteTransaction(tx).findExistingBySource(
      input,
    );
  });
}
