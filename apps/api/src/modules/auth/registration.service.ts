import { AppError } from "../_core/errors/app-error.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type {
  AuthUserRecord,
  IssuedSession,
  SessionContext,
  SessionIssuer,
} from "./authentication.service.js";
import { hashPassword } from "./password-hash.js";

export type RegisterCommand = {
  email: string;
  firstName: string;
  ipAddress?: string;
  lastName: string;
  password: string;
  userAgent?: string;
};

export interface RegistrationRepository {
  createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    now: Date;
    passwordHash: string;
    slug: string;
  }): Promise<
    | { status: "created"; user: AuthUserRecord }
    | { status: "email_conflict" | "slug_conflict" }
  >;
}

export class PasswordRegistrationService {
  constructor(
    private readonly repository: RegistrationRepository,
    private readonly sessionIssuer: SessionIssuer,
    private readonly slugAllocator: SlugAllocator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(command: RegisterCommand): Promise<IssuedSession> {
    const now = this.now();
    const normalizedEmail = command.email.trim().toLowerCase();
    const passwordHash = hashPassword(command.password);
    const slugSource = `${command.firstName} ${command.lastName}`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = await this.slugAllocator.allocateSlug({
        entityType: "user",
        value: slugSource,
      });
      const creationResult = await this.repository.createUser({
        email: normalizedEmail,
        firstName: command.firstName.trim(),
        lastName: command.lastName.trim(),
        now,
        passwordHash,
        slug,
      });

      switch (creationResult.status) {
        case "created":
          return this.sessionIssuer.issueSession(
            creationResult.user,
            now,
            toSessionContext(command.ipAddress, command.userAgent),
          );
        case "email_conflict":
          throw duplicateEmailError();
        case "slug_conflict":
          break;
      }
    }

    throw slugGenerationError();
  }
}

function duplicateEmailError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "An account with that email already exists.",
    statusCode: 409,
    title: "Email already registered",
  });
}

function slugGenerationError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "Unable to allocate a unique user slug. Try again.",
    statusCode: 409,
    title: "Registration conflict",
  });
}

function toSessionContext(
  ipAddress: string | undefined,
  userAgent: string | undefined,
): SessionContext | undefined {
  const context: SessionContext = {};

  if (ipAddress) {
    context.ipAddress = ipAddress;
  }

  if (userAgent) {
    context.userAgent = userAgent;
  }

  return Object.keys(context).length > 0 ? context : undefined;
}
