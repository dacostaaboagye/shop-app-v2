import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer } from "../src/server/create-server.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const DELIVERY_REFERENCE = "DLV-00001";
const LOCATION_SLUG = "main-store";
const AUTH_HEADERS = { authorization: "Bearer test-token" };

describe("delivery default unwired runtime routes", () => {
  it("returns a structured 503 for creation when delivery services are not wired", async () => {
    const server = createUnwiredDeliveryServer();

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        destination: deliveryDestination(),
        orderReference: "WEB-2026-000001",
      },
      url: "/api/deliveries/from-online-order",
    });

    assertDeliveriesUnavailable(response);
  });

  it("returns a structured 503 for status changes when delivery services are not wired", async () => {
    const server = createUnwiredDeliveryServer();

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {},
      url: `/api/deliveries/${DELIVERY_REFERENCE}/dispatch`,
    });

    assertDeliveriesUnavailable(response);
  });

  it("returns a structured 503 for detail queries when delivery services are not wired", async () => {
    const server = createUnwiredDeliveryServer();

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries/${DELIVERY_REFERENCE}`,
    });

    assertDeliveriesUnavailable(response);
  });

  it("returns a structured 503 for list queries when delivery services are not wired", async () => {
    const server = createUnwiredDeliveryServer();

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "GET",
      url: `/api/deliveries?locationSlug=${LOCATION_SLUG}`,
    });

    assertDeliveriesUnavailable(response);
  });
});

function createUnwiredDeliveryServer() {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "manager-user" };
        },
      },
      permissionService: {
        async assertHasPermission() {},
      },
    },
  });
}

function assertDeliveriesUnavailable(response: {
  json(): { code: string; detail: string; requestId: string; title: string };
  statusCode: number;
}) {
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, "internal_error");
  assert.equal(response.json().title, "Deliveries unavailable");
  assert.equal(
    response.json().detail,
    "Delivery services are not configured for this environment.",
  );
  assert.equal(typeof response.json().requestId, "string");
}

function deliveryDestination() {
  return {
    addressLines: ["12 Market Street"],
    city: "Accra",
    contactEmail: null,
    contactName: "Adwoa Mensah",
    contactPhone: "+233200000000",
    countryCode: "GH",
    notes: null,
    postalCode: null,
    region: null,
  };
}
