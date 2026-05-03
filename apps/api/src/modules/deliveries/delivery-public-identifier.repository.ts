import { locations, users } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export interface DeliveryPublicIdentifierResolver {
  findLocationIdBySlug(slug: string): Promise<string | null>;
  findUserIdBySlug(slug: string): Promise<string | null>;
}

export class PostgresDeliveryPublicIdentifierRepository
  implements DeliveryPublicIdentifierResolver
{
  constructor(private readonly db: ApiDatabase) {}

  async findLocationIdBySlug(slug: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.slug, slug))
      .limit(1);
    return row?.id ?? null;
  }

  async findUserIdBySlug(slug: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1);
    return row?.id ?? null;
  }
}
