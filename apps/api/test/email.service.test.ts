import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { EmailService } from "../src/modules/auth/email.service.js";

describe("EmailService", () => {
  it("uses the console fallback when no provider is configured in development", async () => {
    const logs: string[] = [];
    const service = new EmailService(undefined, "noreply@example.com", {
      logger: {
        error: () => undefined,
        log: (message) => logs.push(String(message)),
      },
    });

    await service.sendVerificationEmail({
      firstName: "Store",
      to: "worker@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=test",
    });

    assert.equal(logs.length, 2);
    assert.match(logs[0] ?? "", /worker@example\.com/);
  });

  it("fails fast when production email delivery has no provider", () => {
    assert.throws(
      () =>
        new EmailService(undefined, "noreply@example.com", {
          allowConsoleFallback: false,
        }),
      /RESEND_API_KEY/,
    );
  });

  it("returns a structured delivery failure when the provider rejects a message", async () => {
    const service = new EmailService("test-key", "noreply@example.com", {
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          return { error: { message: "domain is not verified" } };
        },
      },
    });

    await assert.rejects(
      () =>
        service.sendPasswordResetEmail({
          firstName: "Store",
          resetUrl: "http://localhost:3000/reset-password?token=test",
          to: "worker@example.com",
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 502 &&
        error.title === "Email delivery failed",
    );
  });
});
