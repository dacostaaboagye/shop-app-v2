import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  approveManualInvoiceRequest,
  createManagerManualInvoiceRequest,
  fetchManualInvoiceRequests,
  rejectManualInvoiceRequest,
} from "./manual-invoices";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("manual invoice react-query wrappers", () => {
  it("fetches admin manual requests with filters", async () => {
    setSession();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://localhost:4000/api/admin/invoices/manual-requests?page=2&pageSize=10&status=pending&locationId=22222222-2222-4222-8222-222222222221&q=MIR",
      );
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${"a".repeat(64)}`,
      );
      return jsonResponse({ items: [], page: 2, pageSize: 10, total: 0 });
    };

    const result = await fetchManualInvoiceRequests("admin", {
      locationId: "22222222-2222-4222-8222-222222222221",
      page: 2,
      pageSize: 10,
      q: "MIR",
      status: "pending",
    });

    assert.equal(result.page, 2);
  });

  it("posts manager create and admin decisions to manual request endpoints", async () => {
    setSession();
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    const seen: string[] = [];
    globalThis.fetch = async (input, init) => {
      seen.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).endsWith("/approve")) {
        assert.deepEqual(JSON.parse(String(init?.body)), { note: "Looks ok" });
      }
      if (String(input).endsWith("/reject")) {
        assert.deepEqual(JSON.parse(String(init?.body)), { reason: "Wrong" });
      }
      return jsonResponse({ reference: "MIR-00001" });
    };

    await createManagerManualInvoiceRequest({
      customerName: "Customer",
      lines: [
        {
          quantity: 1,
          skuId: "77777777-7777-4777-8777-777777777777",
          unitPrice: "10.00",
        },
      ],
      locationId: "22222222-2222-4222-8222-222222222221",
      reason: "Exceptional sale",
    });
    await approveManualInvoiceRequest("MIR-00001", { note: "Looks ok" });
    await rejectManualInvoiceRequest("MIR-00002", { reason: "Wrong" });

    assert.deepEqual(seen, [
      "POST http://localhost:4000/api/manager/invoices/manual-requests",
      "POST http://localhost:4000/api/admin/invoices/manual-requests/MIR-00001/approve",
      "POST http://localhost:4000/api/admin/invoices/manual-requests/MIR-00002/reject",
    ]);
  });
});

function setSession() {
  useAuthSessionStore.getState().setSession({
    accessToken: "a".repeat(64),
    accessTokenExpiresAt: "2026-05-23T21:00:00.000Z",
    user: {
      availablePortals: ["admin"],
      email: "admin@example.com",
      emailVerified: true,
      firstName: "Admin",
      lastLoginAt: null,
      lastName: "One",
      notificationPreferences: {
        emailEnabled: true,
        inAppEnabled: true,
        soundEnabled: true,
      },
      preferredPortal: "admin",
      requiresPasswordChange: false,
      slug: "admin-one",
      status: "active",
    },
  });
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
