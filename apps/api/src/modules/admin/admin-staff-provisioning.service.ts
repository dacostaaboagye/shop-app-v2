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
  }): Promise<
    | { status: "created"; user: CreatedStaffUser }
    | { status: "email_conflict" }
    | { status: "slug_conflict" }
  >;
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
  ): Promise<AdminCreateUserResponse> {
    validateRoleScopes(input.roleAssignments);
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
      });

      if (result.status === "email_conflict") {
        throw duplicateEmailError();
      }

      if (result.status === "slug_conflict") {
        continue;
      }

      const user = result.user;

      try {
        await this.eventPublisher?.publish(
          createAdminUserCreatedEvent({
            actor,
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
