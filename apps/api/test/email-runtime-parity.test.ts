import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EmailService } from "../src/modules/messaging/email.service.js";
import { resolveEmailConfiguration } from "../src/modules/messaging/email-configuration.js";
import { previewEmailTemplate } from "../src/modules/official-documents/official-document-email-template-preview.service.js";

const EMAIL_FROM_ADDRESS = "noreply@example.com";
const LOGO_IMAGE_URL = "https://cdn.example.test/logo.png";
const PASSWORD_RESET_URL =
  "https://app.example.com/reset-password?token=sample-token";
const VERIFICATION_URL =
  "https://app.example.com/verify-email?token=sample-token";

describe("email runtime parity", () => {
  it("uses the same sender and rendered content for password reset preview and live send", async () => {
    const delivered: Array<{
      html: string;
      replyTo?: string;
      subject: string;
      text: string;
    }> = [];
    const settings = createSettings();
    const service = createConfiguredService(delivered, settings);

    const preview = previewEmailTemplate({
      emailFromAddress: EMAIL_FROM_ADDRESS,
      logoImageUrl: LOGO_IMAGE_URL,
      settings,
      type: "passwordReset",
    });

    await service.sendPasswordResetEmail({
      firstName: "Ama",
      resetUrl: PASSWORD_RESET_URL,
      to: "ama@example.com",
    });

    assert.equal(delivered[0]?.subject, preview.subject);
    assert.equal(delivered[0]?.text, preview.text);
    assert.equal(delivered[0]?.html, preview.html);
    assert.equal(delivered[0]?.replyTo, "accounts@example.com");
  });

  it("uses the same sender and rendered content for email verification preview and live send", async () => {
    const delivered: Array<{
      html: string;
      replyTo?: string;
      subject: string;
      text: string;
    }> = [];
    const settings = createSettings();
    const service = createConfiguredService(delivered, settings);

    const preview = previewEmailTemplate({
      emailFromAddress: EMAIL_FROM_ADDRESS,
      logoImageUrl: LOGO_IMAGE_URL,
      settings,
      type: "emailVerification",
    });

    await service.sendVerificationEmail({
      firstName: "Ama",
      to: "ama@example.com",
      verificationUrl: VERIFICATION_URL,
    });

    assert.equal(delivered[0]?.subject, preview.subject);
    assert.equal(delivered[0]?.text, preview.text);
    assert.equal(delivered[0]?.html, preview.html);
    assert.equal(delivered[0]?.replyTo, "accounts@example.com");
  });
});

function createConfiguredService(
  delivered: Array<{
    html: string;
    replyTo?: string;
    subject: string;
    text: string;
  }>,
  settings: ReturnType<typeof createSettings>,
) {
  return new EmailService("test-key", EMAIL_FROM_ADDRESS, {
    logger: {
      error: () => undefined,
      log: () => undefined,
    },
    templateProvider: {
      async getEmailTemplateSettings() {
        return resolveEmailConfiguration({
          brand: {
            accentColor: settings.brand.accentColor,
            brandName: settings.brand.brandName,
            logoImageUrl: LOGO_IMAGE_URL,
            logoText: settings.brand.logoText,
            primaryColor: settings.brand.primaryColor,
          },
          businessEmail: settings.business.email,
          emailFromAddress: EMAIL_FROM_ADDRESS,
          emailTemplates: settings.emailTemplates,
        });
      },
    },
    transport: {
      async send(options) {
        delivered.push(options);
        return { data: { id: "msg_test" } };
      },
    },
  });
}

function createSettings() {
  return {
    brand: {
      accentColor: "hsl(28 72% 48%)",
      brandName: "Shop App",
      logoText: "SA",
      primaryColor: "hsl(174 52% 23%)",
    },
    business: {
      addressLines: ["Primary business location"],
      email: "accounts@example.com",
      legalName: "Shop App Trading Company",
      phone: "+233 00 000 0000",
      registrationNumber: "REG-001",
      taxNumber: "TAX-001",
      website: "www.example.com",
    },
    currency: {
      allowExchangeRates: false,
      allowMultiCurrencySales: false,
      baseCurrencyCode: "GHS",
      currencyScale: 2,
      defaultDisplayCurrencyCode: "GHS",
      roundingMode: "half_up" as const,
    },
    documents: {
      defaultPaperSize: "receipt_80mm" as const,
      gtnPrefix: "GTN",
      invoicePrefix: "INV",
      locale: "en-GH",
      receiptFooter: "Official document.",
      receiptPrefix: "RCT",
      timezone: "Africa/Accra",
    },
    emailTemplates: {
      emailVerification: {
        actionLabel: "Verify email address",
        footer: "This link expires in 24 hours.",
        heading: "Verify your email",
        intro: "Hi {{firstName}}, please verify your email address.",
        subject: "Verify your email address",
      },
      passwordReset: {
        actionLabel: "Reset password",
        footer: "This link expires in 1 hour.",
        heading: "Reset your password",
        intro: "Hi {{firstName}}, we received a password reset request.",
        subject: "Reset your password",
      },
      supplierInvite: {
        actionLabel: "Set up portal access",
        footer: "This link expires in 1 hour.",
        heading: "Supplier portal access",
        intro:
          "Hi {{firstName}}, you have been invited to manage {{supplierName}}.",
        subject: "Supplier portal invitation for {{supplierName}}",
      },
    },
    locationOverridePolicy: {
      allowLocationAddress: true,
      allowLocationContact: true,
      allowLocationDisplayName: true,
      allowLocationFooter: true,
      allowLocationNumberPrefix: true,
      allowLocationPaperSize: true,
    },
  };
}
