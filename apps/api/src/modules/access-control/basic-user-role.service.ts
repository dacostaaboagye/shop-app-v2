import { roles, userRoles } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type EnsureAssignedInput = {
  assignedAt: Date;
  db: ApiDatabase;
  userId: string;
};

export class BasicUserRoleService {
  async ensureAssigned(input: EnsureAssignedInput): Promise<void> {
    const [role] = await input.db
      .insert(roles)
      .values({
        slug: "basic_user",
        name: "Basic User",
        description: "Default authenticated platform user role.",
        isSystem: true,
        createdAt: input.assignedAt,
      })
      .onConflictDoUpdate({ 
        target: roles.slug, 
        set: { slug: "basic_user" } 
      })
      .returning({ id: roles.id });

    if (!role) {
      throw new Error("Unable to resolve basic_user role.");
    }

    await input.db
      .insert(userRoles)
      .values({
        userId: input.userId,
        roleId: role.id,
        assignedAt: input.assignedAt,
      })
      .onConflictDoNothing();
  }
}
