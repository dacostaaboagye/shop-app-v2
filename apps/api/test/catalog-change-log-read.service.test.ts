import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CatalogChangeLogReadRepository,
  CatalogChangeLogReadService,
  clampLimit,
  DEFAULT_CHANGE_LOG_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  InvalidChangeLogCursorError,
  MAX_CHANGE_LOG_PAGE_SIZE,
} from "../src/modules/catalog-change-log/catalog-change-log-read.service.js";
import type {
  ChangeLogCursor,
  ChangeLogEntry,
} from "../src/modules/catalog-change-log/catalog-change-log-read.types.js";

const ENTITY_ID = "11111111-1111-4111-8111-111111111111";
const BASE_TIME = new Date("2026-05-02T10:00:00.000Z");

function makeEntry(overrides: Partial<ChangeLogEntry> = {}): ChangeLogEntry {
  return {
    id: "row-id-default",
    entityType: "catalog_product",
    entityRef: "widget",
    parentEntityType: null,
    parentEntityRef: null,
    operation: "updated",
    changedFields: ["name"],
    before: { name: "Old" },
    after: { name: "New" },
    actorSlug: "alice",
    actorName: "Alice Test",
    actorAvatarUrl: null,
    occurredAt: BASE_TIME.toISOString(),
    ...overrides,
  };
}

class StubRepo implements CatalogChangeLogReadRepository {
  lastEntityCall: { cursor: ChangeLogCursor | null; limit: number } | null =
    null;
  lastParentCall: { cursor: ChangeLogCursor | null; limit: number } | null =
    null;

  constructor(
    private readonly entityRows: ChangeLogEntry[] = [],
    private readonly parentRows: ChangeLogEntry[] = [],
  ) {}

  async findByEntity(input: {
    entityType: ChangeLogEntry["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    this.lastEntityCall = { cursor: input.cursor, limit: input.limit };
    return this.entityRows.slice(0, input.limit);
  }

  async findByEntityOrParent(input: {
    entityType: ChangeLogEntry["entityType"];
    entityId: string;
    cursor: ChangeLogCursor | null;
    limit: number;
  }): Promise<ChangeLogEntry[]> {
    this.lastParentCall = { cursor: input.cursor, limit: input.limit };
    return this.parentRows.slice(0, input.limit);
  }
}

describe("CatalogChangeLogReadService", () => {
  describe("cursor encode/decode", () => {
    it("round-trips an (occurredAt, id) cursor", () => {
      const cursor: ChangeLogCursor = {
        occurredAt: BASE_TIME,
        id: "abc-123",
      };
      const encoded = encodeCursor(cursor);
      const decoded = decodeCursor(encoded);

      assert.ok(decoded);
      assert.equal(decoded.occurredAt.toISOString(), BASE_TIME.toISOString());
      assert.equal(decoded.id, "abc-123");
    });

    it("returns null for an empty or null cursor input", () => {
      assert.equal(decodeCursor(null), null);
      assert.equal(decodeCursor(""), null);
    });

    it("rejects malformed cursors with InvalidChangeLogCursorError", () => {
      assert.throws(
        () => decodeCursor("not-base64-and-not-json"),
        InvalidChangeLogCursorError,
      );
      const notJson = Buffer.from("not json", "utf8").toString("base64url");
      assert.throws(() => decodeCursor(notJson), InvalidChangeLogCursorError);
      const wrongShape = Buffer.from(
        JSON.stringify({ wrong: "shape" }),
        "utf8",
      ).toString("base64url");
      assert.throws(
        () => decodeCursor(wrongShape),
        InvalidChangeLogCursorError,
      );
      const badDate = Buffer.from(
        JSON.stringify({ t: "not-a-date", i: "x" }),
        "utf8",
      ).toString("base64url");
      assert.throws(() => decodeCursor(badDate), InvalidChangeLogCursorError);
    });
  });

  describe("clampLimit", () => {
    it("returns the default for undefined / non-positive / non-finite values", () => {
      assert.equal(clampLimit(undefined), DEFAULT_CHANGE_LOG_PAGE_SIZE);
      assert.equal(clampLimit(0), DEFAULT_CHANGE_LOG_PAGE_SIZE);
      assert.equal(clampLimit(-5), DEFAULT_CHANGE_LOG_PAGE_SIZE);
      assert.equal(clampLimit(Number.NaN), DEFAULT_CHANGE_LOG_PAGE_SIZE);
      assert.equal(
        clampLimit(Number.POSITIVE_INFINITY),
        DEFAULT_CHANGE_LOG_PAGE_SIZE,
      );
    });

    it("caps requests at the maximum page size", () => {
      assert.equal(clampLimit(1000), MAX_CHANGE_LOG_PAGE_SIZE);
      assert.equal(
        clampLimit(MAX_CHANGE_LOG_PAGE_SIZE + 1),
        MAX_CHANGE_LOG_PAGE_SIZE,
      );
    });

    it("preserves valid in-range integers and truncates fractional ones", () => {
      assert.equal(clampLimit(1), 1);
      assert.equal(clampLimit(25), 25);
      assert.equal(clampLimit(7.9), 7);
    });
  });

  describe("readByEntity", () => {
    it("returns an empty page with nextCursor: null when the repo yields no rows", async () => {
      const repo = new StubRepo([], []);
      const service = new CatalogChangeLogReadService(repo);

      const page = await service.readByEntity({
        entityType: "catalog_product",
        entityId: ENTITY_ID,
        limit: 20,
      });

      assert.deepEqual(page, { entries: [], nextCursor: null });
    });

    it("decodes the supplied cursor and forwards it to the repo", async () => {
      const repo = new StubRepo([], []);
      const service = new CatalogChangeLogReadService(repo);
      const cursorString = encodeCursor({
        occurredAt: BASE_TIME,
        id: "cursor-id",
      });

      await service.readByEntity({
        entityType: "catalog_product",
        entityId: ENTITY_ID,
        cursor: cursorString,
        limit: 10,
      });

      assert.ok(repo.lastEntityCall);
      assert.equal(
        repo.lastEntityCall.cursor?.occurredAt.toISOString(),
        BASE_TIME.toISOString(),
      );
      assert.equal(repo.lastEntityCall.cursor?.id, "cursor-id");
    });

    it("requests limit+1 from the repo so it can detect a next page", async () => {
      const repo = new StubRepo([], []);
      const service = new CatalogChangeLogReadService(repo);

      await service.readByEntity({
        entityType: "catalog_product",
        entityId: ENTITY_ID,
        limit: 5,
      });

      assert.equal(repo.lastEntityCall?.limit, 6);
    });

    it("emits a deterministic nextCursor when the repo overflows the requested page", async () => {
      const rows: ChangeLogEntry[] = Array.from({ length: 6 }, (_, idx) =>
        makeEntry({
          id: `id-${idx}`,
          occurredAt: new Date(BASE_TIME.getTime() - idx * 1000).toISOString(),
        }),
      );
      const repo = new StubRepo(rows, []);
      const service = new CatalogChangeLogReadService(repo);

      const page = await service.readByEntity({
        entityType: "catalog_product",
        entityId: ENTITY_ID,
        limit: 5,
      });

      assert.equal(page.entries.length, 5);
      assert.ok(page.nextCursor);

      const decoded = decodeCursor(page.nextCursor);
      assert.ok(decoded);
      // The cursor must point at the last item we returned, not the
      // overflow item — so the next page picks up immediately after it.
      assert.equal(decoded.id, "id-4");
    });

    it("clamps an over-cap requested limit and asks the repo for cap+1", async () => {
      const repo = new StubRepo([], []);
      const service = new CatalogChangeLogReadService(repo);

      await service.readByEntity({
        entityType: "catalog_product",
        entityId: ENTITY_ID,
        limit: 9999,
      });

      assert.equal(repo.lastEntityCall?.limit, MAX_CHANGE_LOG_PAGE_SIZE + 1);
    });
  });

  describe("readByParentMerged", () => {
    it("returns the parent's merged stream and detects a next page", async () => {
      const rows: ChangeLogEntry[] = [
        makeEntry({ id: "p-1", occurredAt: BASE_TIME.toISOString() }),
        makeEntry({
          id: "v-1",
          entityType: "product_variant",
          entityRef: "widget-v1",
          parentEntityType: "catalog_product",
          parentEntityRef: "widget",
          occurredAt: new Date(BASE_TIME.getTime() - 1000).toISOString(),
        }),
        makeEntry({
          id: "v-2",
          entityType: "product_variant",
          entityRef: "widget-v2",
          parentEntityType: "catalog_product",
          parentEntityRef: "widget",
          occurredAt: new Date(BASE_TIME.getTime() - 2000).toISOString(),
        }),
      ];
      const repo = new StubRepo([], rows);
      const service = new CatalogChangeLogReadService(repo);

      const page = await service.readByParentMerged({
        parentEntityType: "catalog_product",
        parentEntityId: ENTITY_ID,
        limit: 2,
      });

      assert.equal(page.entries.length, 2);
      assert.equal(page.entries[0]?.id, "p-1");
      assert.equal(page.entries[1]?.id, "v-1");
      assert.ok(page.nextCursor);
    });
  });
});
