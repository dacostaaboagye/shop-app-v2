import { createHash, randomBytes } from "node:crypto";
import { passwordResetTokens, refreshTokens, users } from "@shop/database";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { AppError } from "../_core/errors/app-error.js";
import type { EmailService } from "./email.service.js";
import { hashPassword } from "./password-hash.js";

const TOKEN_TTL_MINUTES = 60;
const TOKEN_BYTES = 32;

export interface PasswordResetUserRepository {
  findPasswordResetUser(email: string): Promise<{
    id: string;
    email: string;
    firstName: string;
  } | null>;
}

export class PasswordResetService {
  constructor(
    private readonly db: ApiDatabase,
    private readonly userRepository: PasswordResetUserRepository,
    private readonly emailService: EmailService,
    private readonly webBaseUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Initiates a password reset. Always returns successfully to prevent
   * user enumeration — even if the email is not registered.
   */
  async initiateReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user =
      await this.userRepository.findPasswordResetUser(normalizedEmail);

    if (!user) return;

    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    const tokenHash = hashToken(token);
    const now = this.now();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MINUTES * 60 * 1000);

    // Invalidate any existing unused reset tokens for this user
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: now, updatedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
        ),
      );

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    const resetUrl = `${this.webBaseUrl}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const now = this.now();

    const [record] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!record) {
      throw new AppError({
        code: "not_found",
        statusCode: 400,
        title: "Invalid or expired link",
        detail:
          "This password reset link is invalid or has expired. Please request a new one.",
      });
    }

    const passwordHash = hashPassword(newPassword);

    await this.db.transaction(async (tx) => {
      // Mark token as used
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now, updatedAt: now })
        .where(eq(passwordResetTokens.id, record.id));

      // Update password
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: now })
        .where(eq(users.id, record.userId));

      // Revoke all active refresh tokens — force re-login everywhere
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now, revokedReason: "password_reset" })
        .where(
          and(
            eq(refreshTokens.userId, record.userId),
            isNull(refreshTokens.revokedAt),
          ),
        );
    });
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
