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
  input: {
    firstName?: string;
    notificationPreferences?: {
      emailEnabled: boolean;
      inAppEnabled: boolean;
      soundEnabled: boolean;
    };
    lastName?: string;
    preferredPortal?: string | null;
    slug?: string;
  },
): Promise<void> {
  const update: {
    firstName?: string;
    lastName?: string;
    notificationEmailEnabled?: boolean;
    notificationInAppEnabled?: boolean;
    notificationSoundEnabled?: boolean;
    preferredPortal?: PortalKey | null;
    slug?: string;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if ("firstName" in input && input.firstName !== undefined) {
    update.firstName = input.firstName;
  }

  if ("lastName" in input && input.lastName !== undefined) {
    update.lastName = input.lastName;
  }

  if ("preferredPortal" in input) {
    update.preferredPortal = (input.preferredPortal ??
      null) as PortalKey | null;
  }

  if ("slug" in input && input.slug !== undefined) {
    update.slug = input.slug;
  }

  if (input.notificationPreferences) {
    update.notificationEmailEnabled =
      input.notificationPreferences.emailEnabled;
    update.notificationInAppEnabled =
      input.notificationPreferences.inAppEnabled;
    update.notificationSoundEnabled =
      input.notificationPreferences.soundEnabled;
  }

  await db.update(users).set(update).where(eq(users.id, userId));
}
