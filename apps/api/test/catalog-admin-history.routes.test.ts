import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChangeLogEntry } from "../src/modules/catalog-change-log/catalog-change-log-read.types.js";
import {
  authHeaders,
  buildServer,
  makeRow,
  NOW,
  PRODUCT_ID,
  PRODUCT_SLUG,
  VARIANT_1_ID,
  VARIANT_1_SLUG,
} from "./catalog-admin-history.routes.test.support.js";

describe("catalog admin history routes", () => {
  it("returns 403 when the caller lacks catalog.history.view", async () => {
    const server = buildServer({ rows: [], hasPermission: false });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes`,
    });
    assert.equal(response.statusCode, 403);
  });

  it("merges variant and product rows on the product endpoint, in occurredAt DESC order", async () => {
    const t = (offsetSeconds: number) =>
      new Date(NOW.getTime() - offsetSeconds * 1000);
    const rows: ChangeLogEntry[] = [
      makeRow({
        id: "row-product-create",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "created",
        occurredAt: t(50),
      }),
      makeRow({
        id: "row-product-update",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "updated",
        occurredAt: t(40),
      }),
      makeRow({
        id: "row-variant-create",
        entityType: "product_variant",
        entityId: VARIANT_1_ID,
        entityRef: VARIANT_1_SLUG,
        parentEntityType: "catalog_product",
        parentEntityId: PRODUCT_ID,
        parentEntityRef: PRODUCT_SLUG,
        operation: "created",
        occurredAt: t(30),
      }),
      makeRow({
        id: "row-variant-update",
        entityType: "product_variant",
        entityId: VARIANT_1_ID,
        entityRef: VARIANT_1_SLUG,
        parentEntityType: "catalog_product",
        parentEntityId: PRODUCT_ID,
        parentEntityRef: PRODUCT_SLUG,
        operation: "updated",
        occurredAt: t(20),
      }),
      makeRow({
        id: "row-product-archive",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "archived",
        occurredAt: t(10),
      }),
    ];

    const server = buildServer({ rows, hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes`,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.entries.length, 5);
    assert.equal(body.nextCursor, null);
    assert.deepEqual(
      body.entries.map((e: ChangeLogEntry) => e.operation),
      ["archived", "updated", "created", "updated", "created"],
    );
    assert.deepEqual(
      body.entries.map((e: ChangeLogEntry) => e.entityType),
      [
        "catalog_product",
        "product_variant",
        "product_variant",
        "catalog_product",
        "catalog_product",
      ],
    );
  });

  it("returns an empty page with nextCursor: null for an untouched product", async () => {
    const server = buildServer({ rows: [], hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { entries: [], nextCursor: null });
  });

  it("paginates 25 rows across 3 pages when limit=10 (final page has nextCursor null)", async () => {
    const rows: ChangeLogEntry[] = Array.from({ length: 25 }, (_, idx) =>
      makeRow({
        id: `row-${String(idx).padStart(2, "0")}`,
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "updated",
        occurredAt: new Date(NOW.getTime() - idx * 1000),
      }),
    );
    const server = buildServer({ rows, hasPermission: true });

    const page1 = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes?limit=10`,
    });
    assert.equal(page1.statusCode, 200);
    const body1 = page1.json();
    assert.equal(body1.entries.length, 10);
    assert.ok(body1.nextCursor);

    const page2 = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes?limit=10&cursor=${encodeURIComponent(body1.nextCursor)}`,
    });
    assert.equal(page2.statusCode, 200);
    const body2 = page2.json();
    assert.equal(body2.entries.length, 10);
    assert.ok(body2.nextCursor);

    const page3 = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes?limit=10&cursor=${encodeURIComponent(body2.nextCursor)}`,
    });
    assert.equal(page3.statusCode, 200);
    const body3 = page3.json();
    assert.equal(body3.entries.length, 5);
    assert.equal(body3.nextCursor, null);

    const allOccurredAt = [
      ...body1.entries,
      ...body2.entries,
      ...body3.entries,
    ].map((e: ChangeLogEntry) => e.occurredAt);
    assert.equal(new Set(allOccurredAt).size, 25);
  });

  it("variant endpoint returns variant-only rows and never the parent product rows", async () => {
    const t = (offsetSeconds: number) =>
      new Date(NOW.getTime() - offsetSeconds * 1000);
    const rows: ChangeLogEntry[] = [
      makeRow({
        id: "row-product-create",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "created",
        occurredAt: t(50),
      }),
      makeRow({
        id: "row-variant-create",
        entityType: "product_variant",
        entityId: VARIANT_1_ID,
        entityRef: VARIANT_1_SLUG,
        parentEntityType: "catalog_product",
        parentEntityId: PRODUCT_ID,
        parentEntityRef: PRODUCT_SLUG,
        operation: "created",
        occurredAt: t(30),
      }),
      makeRow({
        id: "row-variant-update",
        entityType: "product_variant",
        entityId: VARIANT_1_ID,
        entityRef: VARIANT_1_SLUG,
        parentEntityType: "catalog_product",
        parentEntityId: PRODUCT_ID,
        parentEntityRef: PRODUCT_SLUG,
        operation: "updated",
        occurredAt: t(10),
      }),
    ];

    const server = buildServer({ rows, hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/variants/${VARIANT_1_SLUG}/changes`,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.entries.length, 2);
    for (const entry of body.entries as ChangeLogEntry[]) {
      assert.equal(entry.entityType, "product_variant");
    }
  });

  it("returns 404 when the slug does not resolve to an entity", async () => {
    const server = buildServer({ rows: [], hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/missing/changes`,
    });
    assert.equal(response.statusCode, 404);
  });

  it("round-trips actorAvatarUrl on each response entry (string and null)", async () => {
    const t = (offsetSeconds: number) =>
      new Date(NOW.getTime() - offsetSeconds * 1000);
    const avatarUrl = "https://cdn.example.com/avatars/test-admin.jpg";
    const rows: ChangeLogEntry[] = [
      makeRow({
        id: "row-with-avatar",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "created",
        occurredAt: t(20),
        actorAvatarUrl: avatarUrl,
      }),
      makeRow({
        id: "row-without-avatar",
        entityType: "catalog_product",
        entityId: PRODUCT_ID,
        entityRef: PRODUCT_SLUG,
        operation: "updated",
        occurredAt: t(10),
      }),
    ];

    const server = buildServer({ rows, hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes`,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.entries.length, 2);
    // Newest first by occurredAt DESC: the avatar-less "updated" leads,
    // then the avatar-bearing "created". Use `operation` as the row key
    // because the schema strips the internal `id` from the response.
    const updatedEntry = body.entries.find(
      (e: ChangeLogEntry) => e.operation === "updated",
    );
    const createdEntry = body.entries.find(
      (e: ChangeLogEntry) => e.operation === "created",
    );
    assert.ok(updatedEntry, "expected an updated entry");
    assert.ok(createdEntry, "expected a created entry");
    assert.equal(updatedEntry.actorAvatarUrl, null);
    assert.equal(createdEntry.actorAvatarUrl, avatarUrl);
  });

  it("returns 400 for an invalid pagination cursor", async () => {
    const server = buildServer({ rows: [], hasPermission: true });
    const response = await server.inject({
      headers: authHeaders(),
      method: "GET",
      url: `/api/admin/catalog/products/${PRODUCT_SLUG}/changes?cursor=not-a-real-cursor`,
    });
    assert.equal(response.statusCode, 400);
  });
});
