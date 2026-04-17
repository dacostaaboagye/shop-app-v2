import { users } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type EmailVerificationUser = {
  email: string;
  emailVerified: boolean;
  firstName: string;
  id: string;
};

type PasswordResetUser = {
  email: string;
  firstName: string;
  id: string;
};

export async function findEmailVerificationUser(
  db: ApiDatabase,
  userId: string,
): Promise<EmailVerificationUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

export async function setUserEmailVerified(
  db: ApiDatabase,
  userId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function findPasswordResetUser(
  db: ApiDatabase,
  email: string,
): Promise<PasswordResetUser | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ?? null;
}
