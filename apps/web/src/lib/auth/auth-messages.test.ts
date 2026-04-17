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
});
