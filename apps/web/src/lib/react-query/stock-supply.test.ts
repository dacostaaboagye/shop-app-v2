import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  fetchSupplyRequestSources,
  postWorkerSupplyRequestBatch,
} from "./stock-supply";

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
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
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

  it("posts grouped worker supply requests to the batch endpoint", async () => {
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
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
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
        "http://localhost:4000/api/worker/stock/supply-requests/batch",
      );
      assert.equal(init?.method, "POST");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        items: [
          {
            requestedQuantity: 3,
            skuId: "77777777-7777-4777-8777-777777777777",
          },
          {
            requestedQuantity: 1,
            skuId: "77777777-7777-4777-8777-777777777778",
          },
        ],
        locationId: "22222222-2222-4222-8222-222222222221",
        notes: "Need multiple items",
        sourceLocationId: "44444444-4444-4444-8444-444444444441",
      });

      return new Response(
        JSON.stringify({
          items: [
            {
              approvedQuantity: null,
              createdAt: "2026-04-19T19:30:00.000Z",
              dispatchedAt: null,
              dispatchedBy: null,
              gtnReference: null,
              locationId: "22222222-2222-4222-8222-222222222221",
              locationName: "Store A",
              notes: "Need multiple items",
              receivedAt: null,
              reference: "SUP-0001",
              requestGroupReference: "SUPB-0001",
              requestedQuantity: 3,
              requesterEmail: "worker@example.com",
              requesterId: "11111111-1111-4111-8111-111111111111",
              requesterName: "Worker One",
              resolutionNotes: null,
              resolvedAt: null,
              resolvedBy: null,
              skuId: "77777777-7777-4777-8777-777777777777",
              skuSnapshot: {
                productName: "Travel Pack",
                sku: "TRAVEL-PACK-001",
                variantName: "Standard",
              },
              sourceLocationId: "44444444-4444-4444-8444-444444444441",
              sourceLocationName: "Warehouse A",
              sourceReservationStatus: null,
              status: "pending",
              supplyRequestId: "66666666-6666-4666-8666-666666666666",
              transferReference: "TRF-0001",
            },
          ],
          requestGroupReference: "SUPB-0001",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    const result = await postWorkerSupplyRequestBatch({
      items: [
        {
          requestedQuantity: 3,
          skuId: "77777777-7777-4777-8777-777777777777",
        },
        {
          requestedQuantity: 1,
          skuId: "77777777-7777-4777-8777-777777777778",
        },
      ],
      locationId: "22222222-2222-4222-8222-222222222221",
      notes: "Need multiple items",
      sourceLocationId: "44444444-4444-4444-8444-444444444441",
    });

    assert.equal(result.requestGroupReference, "SUPB-0001");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.requestGroupReference, "SUPB-0001");
  });
});
