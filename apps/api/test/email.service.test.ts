import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { EmailService } from "../src/modules/messaging/email.service.js";

describe("EmailService", () => {
  it("uses the console fallback when no provider is configured in development", async () => {
    const logs: string[] = [];
    const attempts: unknown[] = [];
    const service = new EmailService(undefined, "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
        },
      },
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
    assert.deepEqual(
      attempts.map((attempt) => (attempt as { status: string }).status),
      ["console_fallback"],
    );
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
    const attempts: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
        },
      },
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
    assert.deepEqual(
      attempts.map((attempt) => (attempt as { status: string }).status),
      ["failed"],
    );
  });

  it("records accepted provider messages without exposing email body content", async () => {
    const attempts: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
        },
      },
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          return { data: { id: "msg_123" } };
        },
      },
    });

    await service.sendVerificationEmail({
      firstName: "Store",
      to: "worker@example.com",
      verificationUrl: "http://localhost:3000/verify-email?token=secret",
    });

    assert.deepEqual(attempts, [
      {
        createdAt: (attempts[0] as { createdAt: Date }).createdAt,
        messageType: "email_verification",
        provider: "resend",
        providerMessageId: "msg_123",
        recipientEmail: "worker@example.com",
        status: "sent",
        subject: "Verify your email address",
      },
    ]);
  });

  it("sends supplier invite email through the delivery recorder", async () => {
    const attempts: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
        },
      },
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          return { data: { id: "msg_supplier" } };
        },
      },
    });

    await service.sendSupplierInviteEmail({
      firstName: "Ama",
      setupUrl: "http://localhost:3000/reset-password?token=secret",
      supplierName: "Acme Distribution",
      to: "ama@acme.example",
    });

    assert.equal(
      (attempts[0] as { messageType: string }).messageType,
      "supplier_invite",
    );
    assert.equal((attempts[0] as { status: string }).status, "sent");
  });

  it("uses configured templates for supplier invite emails", async () => {
    const delivered: Array<{
      html: string;
      replyTo?: string;
      subject: string;
      text: string;
    }> = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      templateProvider: {
        async getEmailTemplateSettings() {
          return {
            brand: {
              accentColor: "hsl(28 72% 48%)",
              brandName: "Shop App",
              logoImageUrl: "https://cdn.example.test/brand-logo.png",
              logoText: "SA",
              primaryColor: "hsl(174 52% 23%)",
            },
            business: { email: "accounts@example.com" },
            sender: {
              fromAddress: "noreply@example.com",
              replyToAddress: "accounts@example.com",
              supportEmail: "accounts@example.com",
            },
            emailTemplates: {
              emailVerification: {
                actionLabel: "Verify",
                footer: "Verification footer",
                heading: "Verify",
                intro: "Hi {{firstName}}",
                subject: "Verify",
              },
              passwordReset: {
                actionLabel: "Reset",
                footer: "Reset footer",
                heading: "Reset",
                intro: "Hi {{firstName}}",
                subject: "Reset",
              },
              supplierInvite: {
                actionLabel: "Join portal",
                footer: "Supplier footer",
                heading: "Welcome supplier",
                intro: "Hello {{firstName}} from {{supplierName}}",
                subject: "Welcome {{supplierName}}",
              },
            },
          };
        },
      },
      transport: {
        async send(options) {
          delivered.push(options);
          return { data: { id: "msg_supplier" } };
        },
      },
    });

    await service.sendSupplierInviteEmail({
      firstName: "Ama",
      setupUrl: "http://localhost:3000/reset-password?token=secret",
      supplierName: "Acme Distribution",
      to: "ama@acme.example",
    });

    assert.equal(delivered[0]?.subject, "Welcome Acme Distribution");
    assert.match(delivered[0]?.text ?? "", /Hello Ama from Acme Distribution/);
    assert.match(delivered[0]?.html ?? "", /Join portal/);
    assert.match(delivered[0]?.html ?? "", /Shop App/);
    assert.match(delivered[0]?.html ?? "", /<meta name="color-scheme"/);
    assert.match(delivered[0]?.html ?? "", /<table role="presentation"/);
    assert.match(
      delivered[0]?.html ?? "",
      /https:\/\/cdn\.example\.test\/brand-logo\.png/,
    );
    assert.match(delivered[0]?.html ?? "", /noreply@example\.com/);
    assert.match(delivered[0]?.html ?? "", /Support: accounts@example\.com/);
    assert.match(
      delivered[0]?.text ?? "",
      /If the button does not work, copy and paste the full link into your browser\./,
    );
    assert.equal(delivered[0]?.replyTo, "accounts@example.com");
  });
});
