import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { fetchSupplyRequestSources } from "./stock-supply";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("stock supply react-query wrappers", () => {
  it("fetches eligible source locations for the selected destination", async () => {
    useAuthSessionStore.getState().setSession({
      accessToken: "a".repeat(64),
      accessTokenExpiresAt: "2026-04-19T21:00:00.000Z",
      user: {
        availablePortals: ["worker"],
        email: "worker@example.com",
        emailVerified: true,
        firstName: "Worker",
        lastLoginAt: null,
        lastName: "One",
        preferredPortal: "worker",
        requiresPasswordChange: false,
        slug: "worker-one",
        status: "active",
      },
    });

    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";

    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://localhost:4000/api/worker/stock/supply-request-sources?destinationLocationId=22222222-2222-4222-8222-222222222221",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );

      return new Response(
        JSON.stringify({
          items: [
            {
              locationId: "44444444-4444-4444-8444-444444444441",
              locationName: "Warehouse A",
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await fetchSupplyRequestSources(
      "22222222-2222-4222-8222-222222222221",
    );

    assert.deepEqual(result.items, [
      {
        locationId: "44444444-4444-4444-8444-444444444441",
        locationName: "Warehouse A",
      },
    ]);
  });
});
