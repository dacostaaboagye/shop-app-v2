import type { AuthSession } from "@shop/contracts";

export function createSessionResponse(accessToken: string) {
  return new Response(
    JSON.stringify({
      accessToken,
      accessTokenExpiresAt: "2026-04-08T13:00:00.000Z",
      user: {
        availablePortals: ["admin"],
        email: "manager@example.com",
        emailVerified: false,
        firstName: "Store",
        lastLoginAt: null,
        lastName: "Manager",
        preferredPortal: "admin",
        requiresPasswordChange: false,
        slug: "store-manager",
        status: "active",
      },
    } satisfies AuthSession),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      code: "unauthorized",
      detail: "A valid bearer access token is required for this route.",
      requestId: "req_401",
      status: 401,
      timestamp: "2026-04-08T00:00:00.000Z",
      title: "Authentication required",
    }),
    {
      status: 401,
      headers: { "content-type": "application/json" },
    },
  );
}
