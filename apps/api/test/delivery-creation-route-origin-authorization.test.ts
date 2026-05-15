import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTH_HEADERS,
  createDeliveryRouteServer,
  deliveryDestination,
  deliveryResponse,
  ORIGIN_LOCATION_ID,
  onlineOrderSource,
  posSaleSource,
  transferSource,
} from "./delivery-creation-route-origin-authorization.support.js";

describe("delivery creation route origin authorization", () => {
  it("rejects POS delivery creation for a foreign source origin before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      posSaleSourcePort: {
        async findByInvoiceReference(reference) {
          events.push(`source:${reference}`);
          return posSaleSource(reference);
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        invoiceReference: "INV/2026/000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-sale",
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_sale:any_active",
      "source:INV/2026/000001",
      `route:deliveries.create_from_sale:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("rejects transfer delivery creation for a foreign source origin before service invocation", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      transferSourcePort: {
        async findByTransferReference(reference) {
          events.push(`source:${reference}`);
          return transferSource(reference);
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        transferReference: "TRF-2026-000001",
      },
      url: "/api/deliveries/from-transfer",
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_transfer:any_active",
      "source:TRF-2026-000001",
      `route:deliveries.create_from_transfer:contextual:${ORIGIN_LOCATION_ID}`,
    ]);
  });

  it("keeps the online-order creation route as a not-found placeholder without invoking service code", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      events,
      onlineOrderSourcePort: {
        async findByOrderReference(reference) {
          events.push(`source:${reference}`);
          return null;
        },
      },
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        orderReference: "WEB-2026-000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-online-order",
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_online_order:any_active",
      "source:WEB-2026-000001",
    ]);
  });

  it("creates an online-order delivery after resolving origin-scoped permission", async () => {
    const events: string[] = [];
    const server = createDeliveryRouteServer({
      allowRoutePermission: true,
      events,
      onlineOrderSourcePort: {
        async findByOrderReference(reference) {
          events.push(`source:${reference}`);
          return onlineOrderSource(reference);
        },
      },
      onlineOrderResponse: deliveryResponse("WEB-2026-000001"),
    });

    const response = await server.inject({
      headers: AUTH_HEADERS,
      method: "POST",
      payload: {
        orderReference: "WEB-2026-000001",
        destination: deliveryDestination(),
      },
      url: "/api/deliveries/from-online-order",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().sourceReference, "WEB-2026-000001");
    assert.deepEqual(events, [
      "middleware:deliveries.create_from_online_order:any_active",
      "source:WEB-2026-000001",
      `route:deliveries.create_from_online_order:contextual:${ORIGIN_LOCATION_ID}`,
      "service:WEB-2026-000001",
    ]);
  });
});
