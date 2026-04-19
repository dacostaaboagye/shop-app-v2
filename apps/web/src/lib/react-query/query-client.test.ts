import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError, NetworkError } from "@/lib/errors/app-error";
import { createQueryClient, shouldRetryQuery } from "./query-client";

describe("query client", () => {
  it("builds API errors from the shared problem details shape", () => {
    const error = new ApiError({
      problem: {
        code: "forbidden",
        detail: "Retry after a short delay.",
        requestId: "req_123",
        status: 429,
        timestamp: "2026-04-08T00:00:00.000Z",
        title: "Too many requests",
      },
      status: 429,
    });

    assert.equal(
      error.message,
      "Too many requests: Retry after a short delay.",
    );
    assert.equal(error.status, 429);
  });

  it("retries only transient query failures", () => {
    assert.equal(
      shouldRetryQuery(
        0,
        new ApiError({ problem: null, status: 500, message: "Server failure" }),
      ),
      true,
    );
    assert.equal(
      shouldRetryQuery(
        2,
        new ApiError({ problem: null, status: 500, message: "Server failure" }),
      ),
      false,
    );
    assert.equal(
      shouldRetryQuery(
        0,
        new ApiError({ problem: null, status: 403, message: "Forbidden" }),
      ),
      false,
    );
    assert.equal(shouldRetryQuery(0, new NetworkError()), true);
  });

  it("creates the default query client profile", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();

    assert.equal(defaults.mutations?.retry, 0);
    assert.equal(defaults.queries?.staleTime, 30_000);
    assert.equal(defaults.queries?.refetchOnWindowFocus, false);
  });
});
