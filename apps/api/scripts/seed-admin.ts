import { hash } from "bcryptjs";
import pg from "pg";
import {
  ensureActiveUserRoleAssignment,
  seedAccessControlCatalog,
} from "./lib/access-control-seed.js";
import { resolveExistingSuperAdminUser } from "./lib/super-admin-seed-support.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const email = process.env.SUPER_ADMIN_EMAIL?.trim();
const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
const firstName = process.env.SUPER_ADMIN_FIRST_NAME?.trim();
const lastName = process.env.SUPER_ADMIN_LAST_NAME?.trim();

if (!email || !password || !firstName || !lastName) {
  throw new Error(
    "SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_FIRST_NAME, and SUPER_ADMIN_LAST_NAME are required.",
  );
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await hash(password ?? "", 12);
    const now = new Date();
    const existingUserResult = await client.query<{
      email: string;
      id: string;
      slug: string;
    }>(
      `
        SELECT id, slug, email
        FROM users
        WHERE slug = 'super-admin' OR email = $1
        FOR UPDATE
      `,
      [email],
    );

    const existingUser = resolveExistingSuperAdminUser(existingUserResult.rows);

    const userResult = existingUser
      ? await client.query<{ id: string }>(
          `
            UPDATE users
            SET slug = 'super-admin',
                first_name = $1,
                last_name = $2,
                email = $3,
                password_hash = $4,
                status = 'active',
                preferred_portal = 'admin',
                requires_password_change = true,
                updated_at = $5
            WHERE id = $6
            RETURNING id
          `,
          [firstName, lastName, email, passwordHash, now, existingUser.id],
        )
      : await client.query<{ id: string }>(
          `
            INSERT INTO users (
              slug, first_name, last_name, email, password_hash,
              status, preferred_portal, requires_password_change,
              created_at, updated_at
            )
            VALUES ('super-admin', $1, $2, $3, $4, 'active', 'admin', true, $5, $5)
            RETURNING id
          `,
          [firstName, lastName, email, passwordHash, now],
        );

    const userId = userResult.rows[0]?.id;

    if (!userId) {
      throw new Error("Failed to upsert super admin user.");
    }

    const roleIds = await seedAccessControlCatalog(client, now);
    const basicUserRoleId = roleIds.get("basic_user");
    const adminRoleId = roleIds.get("admin");

    if (!basicUserRoleId || !adminRoleId) {
      throw new Error("Failed to resolve required seeded roles.");
    }

    await ensureActiveUserRoleAssignment({
      assignedAt: now,
      client,
      roleId: basicUserRoleId,
      userId,
    });
    await ensureActiveUserRoleAssignment({
      assignedAt: now,
      client,
      roleId: adminRoleId,
      userId,
    });

    await client.query("COMMIT");

    console.log("Super admin seeded.");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log("  Portal:   admin");
    console.log("  Roles:    basic_user, admin");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
