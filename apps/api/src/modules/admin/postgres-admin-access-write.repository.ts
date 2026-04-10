import type { AdminRoleDetail } from "@shop/contracts";
import type { Pool } from "pg";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminAccessQueryRepository } from "./admin-access-query.service.js";
import type { AdminAccessWriteRepository } from "./admin-access-write.service.js";

export class PostgresAdminAccessWriteRepository
  implements AdminAccessWriteRepository
{
  constructor(
    private readonly pool: Pool,
    private readonly slugAllocator: SlugAllocator,
    private readonly queryRepository: Pick<
      AdminAccessQueryRepository,
      "getRole"
    >,
  ) {}

  async createRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
  }): Promise<AdminRoleDetail> {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "role",
      value: input.name,
    });
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const roleResult = await client.query<{ id: string }>(
        `
          INSERT INTO roles (slug, name, description, is_system, created_at)
          VALUES ($1, $2, $3, false, $4)
          RETURNING id
        `,
        [slug, input.name, input.description, input.now],
      );
      const roleId = roleResult.rows[0]?.id;

      if (!roleId) {
        throw new Error("Unable to create role.");
      }

      await syncRolePermissions(
        client,
        roleId,
        input.permissionKeys,
        input.now,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return requireRoleDetail(this.queryRepository, slug);
  }

  async updateRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
    slug: string;
  }): Promise<AdminRoleDetail> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const roleResult = await client.query<{ id: string }>(
        `UPDATE roles SET name = $2, description = $3 WHERE slug = $1 RETURNING id`,
        [input.slug, input.name, input.description],
      );
      const roleId = roleResult.rows[0]?.id;

      if (!roleId) {
        throw new Error(`Role ${input.slug} not found.`);
      }

      await syncRolePermissions(
        client,
        roleId,
        input.permissionKeys,
        input.now,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return requireRoleDetail(this.queryRepository, input.slug);
  }
}

async function syncRolePermissions(
  client: Pick<Pool, "query">,
  roleId: string,
  permissionKeys: readonly string[],
  grantedAt: Date,
) {
  const permissionResult = permissionKeys.length
    ? await client.query<{ id: string; key: string }>(
        `SELECT id, key FROM permissions WHERE key = ANY($1::text[])`,
        [permissionKeys],
      )
    : { rows: [] };

  if (permissionResult.rows.length !== permissionKeys.length) {
    throw new Error("One or more permissions could not be resolved.");
  }

  await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [
    roleId,
  ]);

  for (const permission of permissionResult.rows) {
    await client.query(
      `
        INSERT INTO role_permissions (role_id, permission_id, granted_at)
        VALUES ($1, $2, $3)
      `,
      [roleId, permission.id, grantedAt],
    );
  }
}

async function requireRoleDetail(
  repository: Pick<AdminAccessQueryRepository, "getRole">,
  slug: string,
) {
  const role = await repository.getRole(slug);

  if (!role) {
    throw new Error(`Role ${slug} not found.`);
  }

  return role;
}
