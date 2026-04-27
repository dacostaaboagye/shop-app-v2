import {
  catalogProducts,
  locations,
  productVariants,
  users,
} from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AssignmentEventContext } from "./assignment-events.js";

export interface AssignmentEventContextRepository {
  getAssignmentEventContext(input: {
    locationId: string;
    quantity: number;
    skuId: string;
    workerId: string;
  }): Promise<AssignmentEventContext>;
  getWorkerName(workerId: string): Promise<string>;
}

export class PostgresAssignmentEventContextRepository
  implements AssignmentEventContextRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getAssignmentEventContext(input: {
    locationId: string;
    quantity: number;
    skuId: string;
    workerId: string;
  }): Promise<AssignmentEventContext> {
    const [row] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        locationName: locations.name,
        productName: catalogProducts.name,
        sku: productVariants.sku,
        variantName: productVariants.name,
      })
      .from(productVariants)
      .innerJoin(
        catalogProducts,
        eq(catalogProducts.id, productVariants.productId),
      )
      .innerJoin(locations, eq(locations.id, input.locationId))
      .innerJoin(users, eq(users.id, input.workerId))
      .where(
        and(
          eq(productVariants.id, input.skuId),
          eq(locations.id, input.locationId),
          eq(users.id, input.workerId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new Error("Assignment event context could not be resolved.");
    }

    return {
      locationId: input.locationId,
      locationName: row.locationName,
      productName: row.productName,
      quantity: input.quantity,
      sku: row.sku,
      skuId: input.skuId,
      variantName: row.variantName,
      workerId: input.workerId,
      workerName: `${row.firstName} ${row.lastName}`.trim(),
    };
  }

  async getWorkerName(workerId: string): Promise<string> {
    const [row] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, workerId))
      .limit(1);

    if (!row) {
      throw new Error("Assignment worker could not be resolved.");
    }

    return `${row.firstName} ${row.lastName}`.trim();
  }
}
