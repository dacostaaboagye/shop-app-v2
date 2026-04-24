import type { PortalKey } from "@shop/contracts";
import { users } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function clearUserLockout(
  db: ApiDatabase,
  userId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ lockedUntil: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function markUserSuccessfulLogin(
  db: ApiDatabase,
  userId: string,
  occurredAt: Date,
): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: occurredAt, updatedAt: occurredAt })
    .where(eq(users.id, userId));
}

export async function setUserLockout(
  db: ApiDatabase,
  userId: string,
  lockedUntil: Date,
): Promise<void> {
  await db
    .update(users)
    .set({ lockedUntil, updatedAt: lockedUntil })
    .where(eq(users.id, userId));
}

export async function updateUserPreferredPortal(
  db: ApiDatabase,
  userId: string,
  preferredPortal: string | null,
): Promise<void> {
  await db
    .update(users)
    .set({
      preferredPortal: preferredPortal as PortalKey | null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
