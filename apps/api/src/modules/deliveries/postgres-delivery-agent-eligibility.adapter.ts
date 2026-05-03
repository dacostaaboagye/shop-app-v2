import type { DeliveryAgentEligibilityPort } from "@shop/contracts";
import { roles, userRoles, users } from "@shop/database";
import { and, eq, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export class PostgresDeliveryAgentEligibilityAdapter
  implements DeliveryAgentEligibilityPort
{
  constructor(private readonly db: ApiDatabase) {}

  async isEligibleAgent(input: {
    userId: string;
    locationId: string;
  }): Promise<boolean> {
    const rows = await this.db
      .select({ userRoleId: userRoles.id })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(userRoles.userId, input.userId),
          eq(userRoles.locationId, input.locationId),
          eq(roles.slug, "agent"),
          eq(users.status, "active"),
          isNull(userRoles.revokedAt),
        ),
      )
      .limit(1);

    return rows.length > 0;
  }
}
