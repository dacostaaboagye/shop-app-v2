import { createHash, randomBytes } from "node:crypto";
import { emailVerificationTokens, users } from "@shop/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { EmailService } from "../messaging/email.service.js";

const TOKEN_TTL_HOURS = 24;
const TOKEN_BYTES = 32;

export interface EmailVerificationUserRepository {
  findEmailVerificationUser(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    emailVerified: boolean;
  } | null>;
  setEmailVerified(userId: string): Promise<void>;
}

export class EmailVerificationService {
  constructor(
    private readonly db: ApiDatabase,
    private readonly userRepository: EmailVerificationUserRepository,
    private readonly emailService: EmailService,
    private readonly webBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async issueAndSend(userId: string): Promise<void> {
    const user = await this.userRepository.findEmailVerificationUser(userId);

    if (!user || user.emailVerified) return;

    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(token);
    const now = this.now();
    const expiresAt = new Date(
      now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    await this.db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      expiresAt,
      createdAt: now,
    });

    const verificationUrl = `${this.webBaseUrl}/verify-email?token=${token}`;

    await this.emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verificationUrl,
    });
  }

  async verify(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const now = this.now();

    const [record] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!record) {
      throw new AppError({
        code: "not_found",
        statusCode: 400,
        title: "Invalid or expired token",
        detail:
          "This verification link is invalid or has expired. Please request a new one.",
      });
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(emailVerificationTokens)
        .set({ usedAt: now })
        .where(eq(emailVerificationTokens.id, record.id));

      await tx
        .update(users)
        .set({ emailVerified: true, updatedAt: now })
        .where(eq(users.id, record.userId));
    });
  }

  async resend(userId: string): Promise<void> {
    const user = await this.userRepository.findEmailVerificationUser(userId);

    if (!user) {
      throw new AppError({
        code: "not_found",
        statusCode: 404,
        title: "User not found",
        detail: "Could not find your account.",
      });
    }

    if (user.emailVerified) {
      throw new AppError({
        code: "conflict",
        statusCode: 409,
        title: "Already verified",
        detail: "Your email address is already verified.",
      });
    }

    // Invalidate any existing unused tokens for this user
    const now = this.now();
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          isNull(emailVerificationTokens.usedAt),
        ),
      );

    await this.issueAndSend(userId);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
