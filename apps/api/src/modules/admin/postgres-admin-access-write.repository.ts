import type { AdminRoleDetail } from "@shop/contracts";
import { permissions, rolePermissions, roles } from "@shop/database";
import { eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminAccessQueryRepository } from "./admin-access-query.service.js";
import type { AdminAccessWriteRepository } from "./admin-access-write.service.js";

export class PostgresAdminAccessWriteRepository
  implements AdminAccessWriteRepository
{
  constructor(
    private readonly db: ApiDatabase,
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

    await this.db.transaction(async (tx) => {
      const [role] = await tx
        .insert(roles)
        .values({
          slug,
          name: input.name,
          description: input.description,
          isSystem: false,
          createdAt: input.now,
        })
        .returning({ id: roles.id });

      if (!role) {
        throw new Error("Unable to create role.");
      }

      await syncRolePermissions(tx, role.id, input.permissionKeys, input.now);
    });

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
    await this.db.transaction(async (tx) => {
      const [role] = await tx
        .update(roles)
        .set({
          name: input.name,
          description: input.description,
        })
        .where(eq(roles.slug, input.slug))
        .returning({ id: roles.id });

      if (!role) {
        throw new Error(`Role ${input.slug} not found.`);
      }

      await syncRolePermissions(tx, role.id, input.permissionKeys, input.now);
    });

    return requireRoleDetail(this.queryRepository, input.slug);
  }
}

async function syncRolePermissions(
  tx: ApiDatabase,
  roleId: string,
  permissionKeys: readonly string[],
  grantedAt: Date,
) {
  const resolvedPermissions =
    permissionKeys.length > 0
      ? await tx
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.key, [...permissionKeys]))
      : [];

  if (resolvedPermissions.length !== permissionKeys.length) {
    throw new Error("One or more permissions could not be resolved.");
  }

  await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  if (resolvedPermissions.length > 0) {
    await tx.insert(rolePermissions).values(
      resolvedPermissions.map((p) => ({
        roleId,
        permissionId: p.id,
        grantedAt,
      })),
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
