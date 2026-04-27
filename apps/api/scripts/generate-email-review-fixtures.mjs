import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { previewEmailTemplate } from "../dist/src/modules/official-documents/official-document-email-template-preview.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_DIR = path.join(
  REPO_ROOT,
  "docs/product/evidence/email-template-review-fixtures",
);

const EMAIL_FROM_ADDRESS = "noreply@example.com";
const LOGO_IMAGE_URL = "https://cdn.example.test/logo.png";

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const settings = createSettings();
  const fixtureTypes = ["emailVerification", "passwordReset", "supplierInvite"];

  for (const type of fixtureTypes) {
    const preview = previewEmailTemplate({
      emailFromAddress: EMAIL_FROM_ADDRESS,
      logoImageUrl: LOGO_IMAGE_URL,
      settings,
      type,
    });

    await writeFile(
      path.join(OUTPUT_DIR, `${type}.html`),
      preview.html,
      "utf8",
    );
    await writeFile(
      path.join(OUTPUT_DIR, `${type}.txt`),
      normalizeText(preview.text),
      "utf8",
    );
    await writeFile(
      path.join(OUTPUT_DIR, `${type}.json`),
      JSON.stringify(
        {
          allowedVariables: preview.allowedVariables,
          subject: preview.subject,
          type: preview.type,
          unknownVariables: preview.unknownVariables,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  console.log(`Generated email review fixtures in ${OUTPUT_DIR}`);
}

function normalizeText(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function createSettings() {
  return {
    brand: {
      accentColor: "hsl(28 72% 48%)",
      brandName: "Shop App Operations and Logistics Platform West Africa",
      logoText: "SHOP",
      primaryColor: "hsl(174 52% 23%)",
    },
    business: {
      addressLines: ["Primary business location", "Accra, Ghana"],
      email: "accounts-and-support@example.com",
      legalName: "Shop App Trading Company Limited",
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
        actionLabel:
          "Verify your operational access and continue to your first live shift",
        footer:
          "This link expires in 24 hours. If you did not create an account, you can safely ignore this email.",
        heading: "Verify your operational access before your first live shift",
        intro:
          "Hi {{firstName}}, please verify your email address so you can sign in to live stock, sales, and assignment workflows.",
        subject: "Verify your Shop App operational access",
      },
      passwordReset: {
        actionLabel: "Reset your password and restore access to your account",
        footer:
          "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.",
        heading: "Reset your password",
        intro:
          "Hi {{firstName}}, we received a request to reset your Shop App password.",
        subject: "Reset your Shop App password",
      },
      supplierInvite: {
        actionLabel:
          "Set up supplier portal access and review operational activity",
        footer:
          "This link expires in 1 hour. If you were not expecting this invite, contact the business before continuing.",
        heading: "Supplier portal access",
        intro:
          "Hi {{firstName}}, you have been invited to manage supplier activity for {{supplierName}}.",
        subject:
          "Supplier portal invitation for {{supplierName}} operational access",
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

await main();
