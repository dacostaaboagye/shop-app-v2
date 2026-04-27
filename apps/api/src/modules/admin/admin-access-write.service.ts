import type {
  AdminCreateRoleRequest,
  AdminRoleDetail,
  AdminUpdateRoleRequest,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import {
  createAdminRoleCreatedEvent,
  createAdminRoleUpdatedEvent,
} from "./admin-access-events.js";

type AuthenticatedAccessActor = {
  userId: string;
  userSlug: string;
};

export type AdminAccessWriteRepository = {
  createRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
  }): Promise<AdminRoleDetail>;
  updateRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
    slug: string;
  }): Promise<AdminRoleDetail>;
};

export class AdminAccessWriteService {
  constructor(
    private readonly repository: AdminAccessWriteRepository,
    private readonly eventPublisher: PlatformEventPublisher | null = null,
  ) {}

  async createRole(
    actor: AuthenticatedAccessActor,
    input: AdminCreateRoleRequest,
    now: Date,
  ) {
    const role = await this.repository.createRole({
      ...input,
      actorId: actor.userId,
      now,
    });
    await this.eventPublisher?.publish(
      createAdminRoleCreatedEvent({
        actor,
        occurredAt: now,
        request: input,
        role,
      }),
    );
    return role;
  }

  async updateRole(
    actor: AuthenticatedAccessActor,
    slug: string,
    input: AdminUpdateRoleRequest,
    now: Date,
  ) {
    const role = await this.repository.updateRole({
      ...input,
      actorId: actor.userId,
      now,
      slug,
    });
    await this.eventPublisher?.publish(
      createAdminRoleUpdatedEvent({
        actor,
        occurredAt: now,
        request: input,
        role,
      }),
    );
    return role;
  }
}
