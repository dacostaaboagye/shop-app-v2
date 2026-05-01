import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertEmailFromAddressAllowed,
  EmailFromAddressPolicyError,
  extractEmailDomain,
} from "../src/modules/messaging/email-from-address-policy.js";

describe("extractEmailDomain", () => {
  it("returns the lowercase domain for a well-formed address", () => {
    assert.equal(extractEmailDomain("noreply@Acme.Example"), "acme.example");
    assert.equal(extractEmailDomain("user@shop.app"), "shop.app");
  });

  it("returns null for malformed input", () => {
    assert.equal(extractEmailDomain("noreply"), null);
    assert.equal(extractEmailDomain("@noprefix.com"), null);
    assert.equal(extractEmailDomain("trailing@"), null);
    assert.equal(extractEmailDomain("two parts @ here"), null);
  });
});

describe("assertEmailFromAddressAllowed", () => {
  it("waves through any address when the allowlist is empty (opt-in)", () => {
    assert.doesNotThrow(() =>
      assertEmailFromAddressAllowed({
        fromAddress: "anything@spoofed.example",
        allowedDomains: [],
      }),
    );
  });

  it("accepts an address whose domain is in the allowlist", () => {
    assert.doesNotThrow(() =>
      assertEmailFromAddressAllowed({
        fromAddress: "noreply@acme.example",
        allowedDomains: ["acme.example", "brand.example"],
      }),
    );
  });

  it("rejects an address whose domain is not in the allowlist", () => {
    assert.throws(
      () =>
        assertEmailFromAddressAllowed({
          fromAddress: "phishing@evil.example",
          allowedDomains: ["acme.example"],
        }),
      (error: unknown) => {
        assert.ok(error instanceof EmailFromAddressPolicyError);
        assert.match(error.message, /not in EMAIL_ALLOWED_FROM_DOMAINS/);
        return true;
      },
    );
  });

  it("rejects an unparseable from-address", () => {
    assert.throws(
      () =>
        assertEmailFromAddressAllowed({
          fromAddress: "not-an-email",
          allowedDomains: ["acme.example"],
        }),
      (error: unknown) => {
        assert.ok(error instanceof EmailFromAddressPolicyError);
        assert.match(error.message, /not a parseable email address/);
        return true;
      },
    );
  });

  it("matches case-insensitively against the allowlist", () => {
    assert.doesNotThrow(() =>
      assertEmailFromAddressAllowed({
        fromAddress: "noreply@ACME.example",
        allowedDomains: ["acme.example"],
      }),
    );
  });
});
