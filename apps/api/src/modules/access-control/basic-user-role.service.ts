import type { PoolClient } from "pg";

type EnsureAssignedInput = {
  assignedAt: Date;
  client: PoolClient;
  userId: string;
};

export class BasicUserRoleService {
  async ensureAssigned(input: EnsureAssignedInput): Promise<void> {
    const roleResult = await input.client.query<{ id: string }>(
      `
        INSERT INTO roles (slug, name, description, is_system, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id
      `,
      [
        "basic_user",
        "Basic User",
        "Default authenticated platform user role.",
        true,
        input.assignedAt,
      ],
    );

    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error("Unable to resolve basic_user role.");
    }

    await input.client.query(
      `
        INSERT INTO user_roles (user_id, role_id, assigned_at)
        VALUES ($1, $2, $3)
      `,
      [input.userId, roleId, input.assignedAt],
    );
  }
}
