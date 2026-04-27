import { locations } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export interface SalesEventContextRepository {
  getLocationName(locationId: string): Promise<string>;
}

export class PostgresSalesEventContextRepository
  implements SalesEventContextRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getLocationName(locationId: string): Promise<string> {
    const [row] = await this.db
      .select({ name: locations.name })
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);

    if (!row) {
      throw new Error("Sales event location could not be resolved.");
    }

    return row.name;
  }
}
