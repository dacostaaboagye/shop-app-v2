import type {
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminCreateUserRoleAssignmentRequest,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { roleRequiresLocationScope } from "./admin-role-scope-policy.js";
import { createAdminUserCreatedEvent } from "./admin-user-access-events.js";

type AuthenticatedAccessActor = {
  userId: string;
  userSlug: string;
};

export type CreatedStaffUser = {
  email: string;
  firstName: string;
  lastName: string;
  requiresPasswordChange: boolean;
  slug: string;
  status: "active" | "deactivated" | "suspended";
};

export type AdminStaffProvisioningRepository = {
  createStaffUser(input: {
    actorId: string;
    email: string;
    firstName: string;
    lastName: string;
    now: Date;
    reason: string;
    roleAssignments: readonly AdminCreateUserRoleAssignmentRequest[];
    slug: string;
    locationPolicy?: StaffProvisioningLocationPolicy;
  }): Promise<
    | { status: "created"; user: CreatedStaffUser }
    | { status: "email_conflict" }
    | { status: "location_forbidden" }
    | { status: "self_provision" }
    | { status: "slug_conflict" }
  >;
};

export type StaffProvisioningPolicy = {
  actorRole?: "admin" | "manager";
  allowedRoleSlugs?: readonly string[];
  locationPolicy?: StaffProvisioningLocationPolicy;
};

export type StaffProvisioningLocationPolicy = {
  permission: string;
  requireLocationAssignments: boolean;
};
const SETUP_INSTRUCTION =
  "Ask the user to open the sign-in page and use Forgot password to complete password setup.";

export class AdminStaffProvisioningService {
  constructor(
    private readonly repository: AdminStaffProvisioningRepository,
    private readonly slugAllocator: SlugAllocator,
    private readonly eventPublisher: PlatformEventPublisher | null = null,
  ) {}

  async createUser(
    actor: AuthenticatedAccessActor,
    input: AdminCreateUserRequest,
    now: Date,
    policy: StaffProvisioningPolicy = {},
  ): Promise<AdminCreateUserResponse> {
    validateAllowedRoles(input.roleAssignments, policy.allowedRoleSlugs);
    validateRoleScopes(input.roleAssignments);
    validateLocationPolicy(input.roleAssignments, policy.locationPolicy);
    const normalizedEmail = input.email.trim().toLowerCase();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = await this.slugAllocator.allocateSlug({
        entityType: "user",
        value: `${firstName} ${lastName}`,
      });
      const result = await this.repository.createStaffUser({
        actorId: actor.userId,
        email: normalizedEmail,
        firstName,
        lastName,
        now,
        reason: input.reason,
        roleAssignments: input.roleAssignments,
        slug,
        ...(policy.locationPolicy
          ? { locationPolicy: policy.locationPolicy }
          : {}),
      });

      if (result.status === "email_conflict") {
        throw duplicateEmailError();
      }

      if (result.status === "slug_conflict") {
        continue;
      }

      if (result.status === "location_forbidden") {
        throw locationForbiddenError();
      }

      if (result.status === "self_provision") {
        throw selfProvisioningError();
      }

      const user = result.user;

      try {
        await this.eventPublisher?.publish(
          createAdminUserCreatedEvent({
            actor,
            actorRole: policy.actorRole ?? "admin",
            occurredAt: now,
            request: { ...input, email: normalizedEmail, firstName, lastName },
            userSlug: user.slug,
          }),
        );
      } catch (error) {
        console.error("[admin] Failed to publish staff-created event", {
          error: error instanceof Error ? error.message : String(error),
          userSlug: user.slug,
        });
      }

      return {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        requiresPasswordChange: user.requiresPasswordChange,
        roleAssignments: input.roleAssignments,
        setupInstruction: SETUP_INSTRUCTION,
        slug: user.slug,
        status: user.status,
      };
    }
    throw slugGenerationError();
  }
}

function validateRoleScopes(
  roleAssignments: readonly AdminCreateUserRoleAssignmentRequest[],
) {
  for (const assignment of roleAssignments) {
    if (
      roleRequiresLocationScope(assignment.roleSlug) &&
      !assignment.locationSlug
    ) {
      throw new AppError({
        code: "validation_error",
        detail: `Role "${assignment.roleSlug}" must be assigned to a location.`,
        statusCode: 400,
        title: "Location scope required",
      });
    }
  }
}

function validateAllowedRoles(
  roleAssignments: readonly AdminCreateUserRoleAssignmentRequest[],
  allowedRoleSlugs?: readonly string[],
) {
  if (!allowedRoleSlugs) {
    return;
  }

  const allowed = new Set(allowedRoleSlugs);
  for (const assignment of roleAssignments) {
    if (!allowed.has(assignment.roleSlug)) {
      throw new AppError({
        code: "forbidden",
        detail: `Role "${assignment.roleSlug}" cannot be provisioned from this route.`,
        statusCode: 403,
        title: "Role not allowed",
      });
    }
  }
}

function validateLocationPolicy(
  roleAssignments: readonly AdminCreateUserRoleAssignmentRequest[],
  policy?: StaffProvisioningLocationPolicy,
) {
  if (!policy?.requireLocationAssignments) {
    return;
  }

  const locationSlugs = roleAssignments.map((a) => a.locationSlug);

  if (locationSlugs.some((locationSlug) => !locationSlug)) {
    throw new AppError({
      code: "validation_error",
      detail: "Worker provisioning must include at least one location.",
      statusCode: 400,
      title: "Location required",
    });
  }

  if (new Set(locationSlugs).size !== locationSlugs.length) {
    throw new AppError({
      code: "validation_error",
      detail: "Worker provisioning locations must be unique.",
      statusCode: 400,
      title: "Duplicate location",
    });
  }
}

function duplicateEmailError() {
  return new AppError({
    code: "conflict",
    detail: "A user with this email already exists.",
    statusCode: 409,
    title: "Duplicate email",
  });
}

function slugGenerationError() {
  return new AppError({
    code: "conflict",
    detail: "Unable to allocate a unique user slug. Try again.",
    statusCode: 409,
    title: "User slug conflict",
  });
}

function locationForbiddenError() {
  return new AppError({
    code: "forbidden",
    detail: "The requested worker location is outside your access scope.",
    statusCode: 403,
    title: "Location not allowed",
  });
}

function selfProvisioningError() {
  return new AppError({
    code: "validation_error",
    detail: "You cannot provision your own account.",
    statusCode: 400,
    title: "Self-provisioning not allowed",
  });
}
