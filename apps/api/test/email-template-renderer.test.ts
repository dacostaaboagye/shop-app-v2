import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findTemplateVariables,
  renderConfiguredEmailTemplate,
} from "../src/modules/messaging/email-template-renderer.js";

const BRAND = {
  accentColor: "#d97706",
  brandName: "Shop App",
  fromAddress: "noreply@example.com",
  logoImageUrl: null,
  logoText: "SA",
  primaryColor: "#1a5f5f",
  supportEmail: "support@example.com",
};

const BASE_TEMPLATE = {
  actionLabel: "Verify email address",
  footer: "If you did not request this, ignore this email.",
  heading: "Verify your email",
  intro: "Hi {{firstName}}, please verify your email.",
  subject: "Verify your email address",
};

describe("renderConfiguredEmailTemplate", () => {
  it("interpolates {{firstName}} in the intro", () => {
    const { text } = renderConfiguredEmailTemplate({
      actionUrl: "https://example.com/verify",
      brand: BRAND,
      template: BASE_TEMPLATE,
      variables: { firstName: "Kwame" },
    });

    assert.match(text, /Hi Kwame, please verify your email\./);
  });

  it("interpolates {{supplierName}} in both subject and intro", () => {
    const template = {
      actionLabel: "Set up portal access",
      footer: "Contact us if you were not expecting this.",
      heading: "Supplier portal access",
      intro: "Hello {{firstName}} from {{supplierName}}.",
      subject: "Welcome {{supplierName}}",
    };

    const { subject, text } = renderConfiguredEmailTemplate({
      actionUrl: "https://example.com/setup",
      brand: BRAND,
      template,
      variables: { firstName: "Ama", supplierName: "Acme Distribution" },
    });

    assert.equal(subject, "Welcome Acme Distribution");
    assert.match(text, /Hello Ama from Acme Distribution\./);
  });

  it("replaces unknown variables with an empty string", () => {
    const template = {
      ...BASE_TEMPLATE,
      intro: "Hi {{firstName}}, your order {{orderId}} is ready.",
    };

    const { text } = renderConfiguredEmailTemplate({
      actionUrl: "https://example.com/order",
      brand: BRAND,
      template,
      variables: { firstName: "Kofi" },
    });

    // {{orderId}} should be replaced with "" not left as-is
    assert.match(text, /Hi Kofi, your order {2}is ready\./);
    assert.doesNotMatch(text, /\{\{orderId\}\}/);
  });

  it("includes the action URL in both HTML and text output", () => {
    const { html, text } = renderConfiguredEmailTemplate({
      actionUrl: "https://example.com/go",
      brand: BRAND,
      template: BASE_TEMPLATE,
      variables: { firstName: "Akosua" },
    });

    assert.match(html, /https:\/\/example\.com\/go/);
    assert.match(text, /https:\/\/example\.com\/go/);
  });
});

describe("findTemplateVariables", () => {
  it("returns sorted deduplicated variable names", () => {
    const template = {
      actionLabel: "Join portal",
      footer: "Thanks, {{supplierName}}.",
      heading: "Welcome {{supplierName}}",
      intro: "Hello {{firstName}} from {{supplierName}}.",
      subject: "Portal access for {{supplierName}}",
    };

    const variables = findTemplateVariables(template);

    assert.deepEqual(variables, ["firstName", "supplierName"]);
  });

  it("returns an empty array when the template has no variables", () => {
    const template = {
      actionLabel: "Click here",
      footer: "No variables here.",
      heading: "Static heading",
      intro: "Static intro.",
      subject: "Static subject",
    };

    const variables = findTemplateVariables(template);

    assert.deepEqual(variables, []);
  });

  it("handles variables with extra whitespace inside braces", () => {
    const template = {
      actionLabel: "Go",
      footer: "Footer",
      heading: "Hello {{ firstName }}",
      intro: "Intro",
      subject: "Subject",
    };

    const variables = findTemplateVariables(template);

    assert.deepEqual(variables, ["firstName"]);
  });
});
