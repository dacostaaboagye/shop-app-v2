import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailHtml,
  emailText,
  escapeHtml,
} from "../src/modules/messaging/email-html-layout.js";

const BRAND = {
  accentColor: "#d97706",
  brandName: "Shop App",
  fromAddress: "noreply@example.com",
  logoImageUrl: null,
  logoText: "SA",
  primaryColor: "#1a5f5f",
  supportEmail: "support@example.com",
};

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    assert.equal(escapeHtml("A & B"), "A &amp; B");
  });

  it("escapes less-than signs", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    assert.equal(escapeHtml('"quoted"'), "&quot;quoted&quot;");
  });

  it("leaves safe characters unchanged", () => {
    assert.equal(escapeHtml("Hello world"), "Hello world");
  });
});

describe("emailHtml", () => {
  it("includes the heading in the rendered output", () => {
    const html = emailHtml({
      actionLabel: "Click here",
      actionUrl: "https://example.com/action",
      brand: BRAND,
      footer: "Footer text",
      heading: "Verify your email",
      intro: "Welcome aboard",
    });

    assert.match(html, /Verify your email/);
  });

  it("includes the intro and action button", () => {
    const html = emailHtml({
      actionLabel: "Confirm account",
      actionUrl: "https://example.com/confirm",
      brand: BRAND,
      footer: "Footer copy",
      heading: "Hello",
      intro: "Thanks for joining us",
    });

    assert.match(html, /Thanks for joining us/);
    assert.match(html, /Confirm account/);
    assert.match(html, /https:\/\/example\.com\/confirm/);
  });

  it("includes the plain-text copy link at the bottom", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com/go",
      brand: BRAND,
      footer: "Footer",
      heading: "H",
      intro: "I",
    });

    assert.match(html, /Or copy this link/);
    assert.match(html, /https:\/\/example\.com\/go/);
  });

  it("uses table-based layout with presentation role", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: BRAND,
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.match(html, /<table role="presentation"/);
  });

  it("includes dark mode media query", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: BRAND,
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.match(html, /prefers-color-scheme: dark/);
  });

  it("renders logo image when logoImageUrl is provided", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: {
        ...BRAND,
        logoImageUrl: "https://cdn.example.com/logo.png",
      },
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.match(html, /<img /);
    assert.match(html, /https:\/\/cdn\.example\.com\/logo\.png/);
  });

  it("renders text abbreviation logo without display:flex when no image", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: { ...BRAND, logoImageUrl: null, logoText: "SA" },
      footer: "F",
      heading: "H",
      intro: "I",
    });

    // Must not use flexbox in the logo fallback (not email-client-safe)
    assert.doesNotMatch(html, /display:\s*flex/);
    // Must use line-height centering instead
    assert.match(html, /line-height:52px/);
    // Text abbreviation is rendered
    assert.match(html, /SA/);
  });

  it("suppresses the support email block when it matches the from address", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: {
        ...BRAND,
        fromAddress: "noreply@example.com",
        supportEmail: "noreply@example.com",
      },
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.doesNotMatch(html, /Support:/);
  });

  it("includes support email when it differs from from address", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: {
        ...BRAND,
        fromAddress: "noreply@example.com",
        supportEmail: "help@example.com",
      },
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.match(html, /Support: help@example\.com/);
  });

  it("escapes brand name to prevent XSS in HTML output", () => {
    const html = emailHtml({
      actionLabel: "Go",
      actionUrl: "https://example.com",
      brand: { ...BRAND, brandName: "<b>Hack & Co.</b>" },
      footer: "F",
      heading: "H",
      intro: "I",
    });

    assert.doesNotMatch(html, /<b>Hack/);
    assert.match(html, /&lt;b&gt;Hack &amp; Co\.&lt;\/b&gt;/);
  });
});

describe("emailText", () => {
  it("renders all sections in the expected order", () => {
    const text = emailText({
      actionLabel: "Verify email address",
      actionUrl: "https://example.com/verify",
      footer: "This link expires in 24 hours.",
      heading: "Verify your email",
      intro: "Hi there, please confirm your account.",
    });

    const lines = text.split("\n");
    const headingIndex = lines.findIndex((l) =>
      l.includes("Verify your email"),
    );
    const introIndex = lines.findIndex((l) => l.includes("please confirm"));
    const actionIndex = lines.findIndex((l) =>
      l.includes("Verify email address"),
    );
    const urlIndex = lines.findIndex((l) =>
      l.includes("https://example.com/verify"),
    );
    const footerIndex = lines.findIndex((l) =>
      l.includes("expires in 24 hours"),
    );
    const copyLinkIndex = lines.findIndex((l) => l.includes("copy and paste"));

    assert.ok(headingIndex < introIndex, "heading before intro");
    assert.ok(introIndex < actionIndex, "intro before action label");
    assert.ok(actionIndex < urlIndex, "action label before URL");
    assert.ok(urlIndex < footerIndex, "URL before footer");
    assert.ok(footerIndex < copyLinkIndex, "footer before copy-link reminder");
  });
});
