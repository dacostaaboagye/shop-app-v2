import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import { fetchFile } from "./fetch-file";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthSessionStore.getState().clearSession();
});

describe("fetchFile", () => {
  it("downloads an authenticated file with the response filename", async () => {
    globalThis.fetch = async (_input, init) => {
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer access-token",
      );
      return new Response("<!doctype html>", {
        headers: {
          "content-disposition": 'attachment; filename="INV-2026-000001.pdf"',
          "content-type": "application/pdf",
        },
        status: 200,
      });
    };
    useAuthSessionStore.getState().setSession({
      accessToken: "access-token",
      accessTokenExpiresAt: "2026-04-20T11:00:00.000Z",
      user: {
        availablePortals: ["worker"],
        email: "worker@example.com",
        emailVerified: true,
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Worker",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
          soundEnabled: true,
        },
        preferredPortal: "worker",
        requiresPasswordChange: false,
        slug: "store-worker",
        status: "active",
      },
    });

    const file = await fetchFile(
      "/api/documents/sales/INV%2F2026%2F000001/download",
      undefined,
      { auth: "required", fallbackFilename: "fallback.pdf" },
    );

    assert.equal(file.name, "INV-2026-000001.pdf");
    assert.equal(file.type, "application/pdf");
    assert.equal(await file.text(), "<!doctype html>");
  });
});
