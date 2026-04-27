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
          return { attemptId: "attempt_console" };
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
    const published: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
          return { attemptId: "attempt_failed" };
        },
      },
      eventPublisher: {
        async publish(event) {
          published.push(event);
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
    assert.equal(
      (published[0] as { type: string }).type,
      "messaging.email.failed",
    );
    assert.equal(
      (published[0] as { payload: { attemptId: string | null } }).payload
        .attemptId,
      "attempt_failed",
    );
    assert.match(
      (published[0] as { summary: string }).summary,
      /worker@example\.com/,
    );
  });

  it("publishes a failed delivery issue event even when attempt recording is unavailable", async () => {
    const published: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      eventPublisher: {
        async publish(event) {
          published.push(event);
        },
      },
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          throw new Error("socket hang up");
        },
      },
    });

    await assert.rejects(
      () =>
        service.sendVerificationEmail({
          firstName: "Store",
          to: "worker@example.com",
          verificationUrl: "http://localhost:3000/verify-email?token=test",
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 502 &&
        error.title === "Email delivery failed",
    );

    assert.equal(
      (published[0] as { type: string }).type,
      "messaging.email.failed",
    );
    assert.equal(
      (published[0] as { payload: { attemptId: string | null } }).payload
        .attemptId,
      null,
    );
    assert.match(
      (published[0] as { resource: { reference: string } }).resource.reference,
      /^send_failure:email_verification:worker@example\.com$/,
    );
  });

  it("records accepted provider messages without exposing email body content", async () => {
    const attempts: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
          return { attemptId: "attempt_sent" };
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
          return { attemptId: "attempt_supplier" };
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

  it("records test emails with the email_test message type", async () => {
    const attempts: unknown[] = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt(input) {
          attempts.push(input);
          return { attemptId: "attempt_test" };
        },
      },
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          return { data: { id: "msg_test" } };
        },
      },
    });

    await service.sendTestEmail({ to: "ops@example.com" });

    assert.equal(
      (attempts[0] as { messageType: string }).messageType,
      "email_test",
    );
    assert.equal((attempts[0] as { status: string }).status, "sent");
    assert.match((attempts[0] as { subject: string }).subject, /^\[Test\]/);
  });

  it("uses the injected webBaseUrl in the test email action URL", async () => {
    const delivered: Array<{ html: string; text: string }> = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send(options) {
          delivered.push(options);
          return { data: { id: "msg_test" } };
        },
      },
      webBaseUrl: "https://myapp.example.com",
    });

    await service.sendTestEmail({ to: "ops@example.com" });

    assert.match(delivered[0]?.html ?? "", /https:\/\/myapp\.example\.com\//);
    assert.match(delivered[0]?.text ?? "", /https:\/\/myapp\.example\.com\//);
  });

  it("falls back to app.example.com in test emails when no webBaseUrl is configured", async () => {
    const delivered: Array<{ html: string; text: string }> = [];
    const service = new EmailService("test-key", "noreply@example.com", {
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send(options) {
          delivered.push(options);
          return { data: { id: "msg_test" } };
        },
      },
    });

    await service.sendTestEmail({ to: "ops@example.com" });

    assert.match(delivered[0]?.html ?? "", /app\.example\.com/);
  });

  it("continues sending even when the delivery recorder throws", async () => {
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryRecorder: {
        async recordAttempt() {
          throw new Error("DB connection lost");
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

    // Must not throw even though the recorder fails
    await assert.doesNotReject(() =>
      service.sendVerificationEmail({
        firstName: "Store",
        to: "worker@example.com",
        verificationUrl: "http://localhost:3000/verify-email?token=test",
      }),
    );
  });

  it("blocks sends when the latest provider state is suppressed", async () => {
    const service = new EmailService("test-key", "noreply@example.com", {
      deliveryPolicy: {
        async assertCanSend(recipientEmail) {
          assert.equal(recipientEmail, "worker@example.com");
          throw new AppError({
            code: "conflict",
            detail:
              "worker@example.com cannot receive email right now because the provider has suppressed the address.",
            details: {
              occurredAt: "2026-04-24T00:00:00.000Z",
              recipientEmail,
              status: "suppressed",
            },
            statusCode: 409,
            title: "Email delivery blocked",
          });
        },
      },
      logger: {
        error: () => undefined,
        log: () => undefined,
      },
      transport: {
        async send() {
          assert.fail("transport.send should not be called for blocked email");
        },
      },
    });

    await assert.rejects(
      () =>
        service.sendVerificationEmail({
          firstName: "Store",
          to: "worker@example.com",
          verificationUrl: "http://localhost:3000/verify-email?token=test",
        }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 409 &&
        error.title === "Email delivery blocked",
    );
  });
});
