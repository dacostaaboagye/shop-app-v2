import type { PortalKey } from "@shop/contracts";
import type { SQL } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AuthUserRecord } from "./authentication.service.js";

export async function findAuthUser(
  db: ApiDatabase,
  where: SQL | undefined,
): Promise<AuthUserRecord | null> {
  const user = await db.query.users.findFirst({
    where,
    with: {
      userRoles: {
        where: (ur, { isNull }) => isNull(ur.revokedAt),
        with: {
          role: true,
        },
      },
    },
  });

  if (!user) return null;

  const availablePortals = user.userRoles
    .map((ur) => ur.role?.slug)
    .filter(
      (slug): slug is string =>
        !!slug &&
        ["admin", "manager", "worker", "supplier", "agent"].includes(slug),
    );

  return {
    ...user,
    preferredPortal: user.preferredPortal as PortalKey | null,
    availablePortals: Array.from(
      new Set(availablePortals),
    ).sort() as PortalKey[],
  };
}
