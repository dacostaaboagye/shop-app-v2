import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiError,
  getAppErrorDisplay,
  getAppErrorMessage,
  isRetryableAppError,
  NetworkError,
} from "./app-error";

describe("app error helpers", () => {
  it("normalizes API problems for frontend display", () => {
    const display = getAppErrorDisplay(
      new ApiError({
        problem: {
          code: "forbidden",
          detail: "You do not have access to this resource.",
          requestId: "req_123",
          status: 403,
          timestamp: "2026-04-17T00:00:00.000Z",
          title: "Forbidden",
        },
        status: 403,
      }),
    );

    assert.deepEqual(display, {
      code: "forbidden",
      detail: "You do not have access to this resource.",
      requestId: "req_123",
      retryable: false,
      status: 403,
      title: "Forbidden",
    });
  });

  it("adds request references to inline error messages", () => {
    const message = getAppErrorMessage(
      new ApiError({
        problem: {
          code: "conflict",
          detail: "The record has changed since you loaded it.",
          requestId: "req_456",
          status: 409,
          timestamp: "2026-04-17T00:00:00.000Z",
          title: "Conflict",
        },
        status: 409,
      }),
    );

    assert.equal(
      message,
      "The record has changed since you loaded it. Reference ID: req_456.",
    );
  });

  it("treats network failures as retryable with calm copy", () => {
    const display = getAppErrorDisplay(new NetworkError());

    assert.equal(display.title, "Connection issue");
    assert.equal(display.retryable, true);
    assert.equal(
      display.detail,
      "We could not reach the server. Check your connection and try again.",
    );
    assert.equal(isRetryableAppError(new NetworkError()), true);
  });
});
