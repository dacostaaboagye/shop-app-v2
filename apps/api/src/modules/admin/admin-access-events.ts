import { randomUUID } from "node:crypto";
import type {
  AdminCreateRoleRequest,
  AdminRoleDetail,
  AdminUpdateRoleRequest,
} from "@shop/contracts";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

type AccessActor = {
  userSlug: string;
};

export function createAdminRoleCreatedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminCreateRoleRequest;
  role: AdminRoleDetail;
}): PlatformEventRecord {
  return createRoleEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      permissionCount: input.role.permissionCount,
      roleName: input.role.name,
      roleSlug: input.role.slug,
    },
    role: input.role,
    summary: `Access role created: ${input.role.name} (${input.role.slug}) with ${input.role.permissionCount} permission${input.role.permissionCount === 1 ? "" : "s"}.`,
    type: "access.role.created",
  });
}

export function createAdminRoleUpdatedEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  request: AdminUpdateRoleRequest;
  role: AdminRoleDetail;
}): PlatformEventRecord {
  return createRoleEvent({
    actor: input.actor,
    occurredAt: input.occurredAt,
    payload: {
      permissionCount: input.role.permissionCount,
      roleName: input.role.name,
      roleSlug: input.role.slug,
    },
    role: input.role,
    summary: `Access role updated: ${input.role.name} (${input.role.slug}) now has ${input.role.permissionCount} permission${input.role.permissionCount === 1 ? "" : "s"}.`,
    type: "access.role.updated",
  });
}

function createRoleEvent(input: {
  actor: AccessActor;
  occurredAt: Date;
  payload: Record<string, string | number>;
  role: AdminRoleDetail;
  summary: string;
  type: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [{ kind: "permission", permission: "access.audit.view" }],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: input.payload,
    resource: {
      kind: "access_role",
      reference: input.role.slug,
    },
    summary: input.summary,
    type: input.type,
  };
}
