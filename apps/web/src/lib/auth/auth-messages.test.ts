import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../react-query/query-client";
import { getAuthErrorMessage, isUnauthorizedApiError } from "./auth-messages";

describe("auth-messages", () => {
  it("formats lockout errors with retry timing", () => {
    const message = getAuthErrorMessage(
      new ApiError({
        problem: {
          code: "unauthorized",
          detail: "Too many failed login attempts. Try again later.",
          details: {
            remainingLockoutSeconds: 300,
          },
          requestId: "req_123",
          status: 401,
          timestamp: "2026-04-08T00:00:00.000Z",
          title: "Account locked",
        },
        status: 401,
      }),
    );

    assert.equal(message.title, "Account locked");
    assert.equal(
      message.detail,
      "Too many failed login attempts. Try again later. Try again in 5 minutes.",
    );
  });

  it("recognizes unauthorized API failures", () => {
    assert.equal(
      isUnauthorizedApiError(
        new ApiError({
          problem: null,
          status: 401,
        }),
      ),
      true,
    );
    assert.equal(isUnauthorizedApiError(new Error("boom")), false);
  });

  it("translates blocked delivery errors into safe auth copy", () => {
    const message = getAuthErrorMessage(
      new ApiError({
        problem: {
          code: "conflict",
          detail:
            "worker@example.com cannot receive email right now because the provider has suppressed the address.",
          details: {
            occurredAt: "2026-04-24T00:00:00.000Z",
            recipientEmail: "worker@example.com",
            status: "suppressed",
          },
          requestId: "req_456",
          status: 409,
          timestamp: "2026-04-24T00:00:00.000Z",
          title: "Email delivery blocked",
        },
        status: 409,
      }),
    );

    assert.equal(message.title, "Email temporarily unavailable");
    assert.equal(
      message.detail,
      "We could not send email to this address right now. Contact support or ask an administrator to check your email delivery status before trying again.",
    );
  });

  it("translates failed delivery errors into safe auth copy", () => {
    const message = getAuthErrorMessage(
      new ApiError({
        problem: {
          code: "internal_error",
          detail: "The provider request failed.",
          requestId: "req_789",
          status: 502,
          timestamp: "2026-04-24T00:00:00.000Z",
          title: "Email delivery failed",
        },
        status: 502,
      }),
    );

    assert.equal(message.title, "Email temporarily unavailable");
    assert.equal(
      message.detail,
      "We could not send that email right now. Please wait a moment and try again. If the problem continues, contact support.",
    );
  });
});
