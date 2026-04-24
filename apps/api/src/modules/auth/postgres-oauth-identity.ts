import type { PortalKey } from "@shop/contracts";
import { userIdentities, users } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { BasicUserRoleService } from "../access-control/basic-user-role.service.js";
import type { AuthUserRecord } from "./authentication.service.js";
import { findAuthUser } from "./postgres-auth-user-record.js";
import { isUniqueViolation } from "./postgres-auth-user-row.js";

export async function findUserByOAuthIdentity(
  db: ApiDatabase,
  provider: string,
  providerUserId: string,
): Promise<AuthUserRecord | null> {
  const [row] = await db
    .select({ userId: userIdentities.userId })
    .from(userIdentities)
    .where(
      and(
        eq(userIdentities.provider, provider),
        eq(userIdentities.providerUserId, providerUserId),
      ),
    )
    .limit(1);

  if (!row) return null;
  return findAuthUser(db, eq(users.id, row.userId));
}

export async function createOAuthUser(
  db: ApiDatabase,
  basicUserRoleService: BasicUserRoleService,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatarUrl: string | null;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    now: Date;
  },
): Promise<AuthUserRecord> {
  const slugSource = `${input.firstName} ${input.lastName}`;
  const { SlugService } = await import("../public-identifiers/slug.service.js");
  const { PostgresSlugRepository } = await import(
    "../public-identifiers/postgres-slug.repository.js"
  );
  const slugService = new SlugService(new PostgresSlugRepository(db));

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await slugService.allocateSlug({
      entityType: "user",
      value: slugSource,
    });

    try {
      const result = await db.transaction(async (tx) => {
        const [userRow] = await tx
          .insert(users)
          .values({
            slug,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: null,
            emailVerified: true,
            preferredPortal: null as PortalKey | null,
            status: "active",
            requiresPasswordChange: false,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoNothing({ target: users.slug })
          .returning();

        if (!userRow) return null;

        await basicUserRoleService.ensureAssigned({
          assignedAt: input.now,
          db: tx,
          userId: userRow.id,
        });

        await tx.insert(userIdentities).values({
          userId: userRow.id,
          provider: input.provider,
          providerUserId: input.providerUserId,
          providerEmail: input.providerEmail,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          createdAt: input.now,
          updatedAt: input.now,
        });

        return userRow;
      });

      if (!result) continue;

      const created = await findAuthUser(db, eq(users.id, result.id));
      if (!created) throw new Error("Failed to load created OAuth user");
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("Email already registered");
      }
      throw error;
    }
  }

  throw new Error("Failed to allocate a unique user slug for OAuth account");
}

export async function linkOAuthIdentity(
  db: ApiDatabase,
  input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail: string;
    displayName: string | null;
    avatarUrl: string | null;
    now: Date;
  },
): Promise<void> {
  await db
    .insert(userIdentities)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      providerEmail: input.providerEmail,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing();
}
