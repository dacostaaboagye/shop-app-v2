import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewEmailTemplate } from "../src/modules/official-documents/official-document-email-template-preview.service.js";

describe("previewEmailTemplate", () => {
  it("uses the env sender and business support email in the rendered preview", () => {
    const preview = previewEmailTemplate({
      emailFromAddress: "noreply@example.com",
      logoImageUrl: "https://cdn.example.test/logo.png",
      settings: {
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
          roundingMode: "half_up",
        },
        documents: {
          defaultPaperSize: "receipt_80mm",
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
      },
      type: "supplierInvite",
    });

    assert.match(preview.html, /noreply@example\.com/);
    assert.match(preview.html, /Support: accounts@example\.com/);
    assert.match(preview.html, /https:\/\/cdn\.example\.test\/logo\.png/);
    assert.match(preview.html, /<meta name="color-scheme"/);
    assert.match(preview.html, /<table role="presentation"/);
    assert.match(
      preview.text,
      /If the button does not work, copy and paste the full link into your browser\./,
    );
  });
});
