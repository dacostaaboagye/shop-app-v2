import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type SlugLookupResult,
  type SlugRedirectRecord,
  type SlugRepository,
  SlugService,
} from "../src/modules/public-identifiers/slug.service.js";

describe("SlugService", () => {
  it("allocates a normalized slug from free-form text", async () => {
    const harness = createHarness();

    const slug = await harness.service.allocateSlug({
      entityType: "user",
      value: "  Store Manager!!  ",
    });

    assert.equal(slug, "store-manager");
  });

  it("skips slugs already used by active records or redirect history", async () => {
    const harness = createHarness({
      lookups: {
        "user:store-manager": { entityUuid: "usr_1", status: "active" },
        "user:store-manager-2": {
          entityUuid: "usr_1",
          newSlug: "store-manager-3",
          status: "redirect",
        },
      },
    });

    const slug = await harness.service.allocateSlug({
      entityType: "user",
      value: "Store Manager",
    });

    assert.equal(slug, "store-manager-3");
  });

  it("plans a slug change and emits redirect metadata", async () => {
    const harness = createHarness();

    const plan = await harness.service.planSlugChange({
      currentSlug: "main-store",
      entityType: "location",
      entityUuid: "loc_1",
      value: "Central Store",
    });

    assert.equal(plan.slug, "central-store");
    assert.deepEqual(plan.redirect, {
      entityType: "location",
      entityUuid: "loc_1",
      newSlug: "central-store",
      oldSlug: "main-store",
    });
  });

  it("resolves redirected slugs to the active slug", async () => {
    const harness = createHarness({
      lookups: {
        "location:main-store": {
          entityUuid: "loc_1",
          newSlug: "central-store",
          status: "redirect",
        },
        "location:central-store": {
          entityUuid: "loc_1",
          newSlug: "flagship-store",
          status: "redirect",
        },
        "location:flagship-store": {
          entityUuid: "loc_1",
          status: "active",
        },
      },
    });

    const resolved = await harness.service.resolveSlug({
      entityType: "location",
      slug: "main-store",
    });

    assert.deepEqual(resolved, {
      entityUuid: "loc_1",
      redirectChain: ["main-store", "central-store", "flagship-store"],
      requestedSlug: "main-store",
      slug: "flagship-store",
      status: "redirected",
    });
  });

  it("records redirects through the repository", async () => {
    const harness = createHarness();

    await harness.service.recordRedirect({
      entityType: "user",
      entityUuid: "usr_1",
      newSlug: "store-manager-2",
      oldSlug: "store-manager",
    });

    assert.deepEqual(harness.state.recordedRedirects, [
      {
        entityType: "user",
        entityUuid: "usr_1",
        newSlug: "store-manager-2",
        oldSlug: "store-manager",
      },
    ]);
  });
});

function createHarness(input?: { lookups?: Record<string, SlugLookupResult> }) {
  const state = {
    recordedRedirects: [] as SlugRedirectRecord[],
  };
  const repository: SlugRepository = {
    async lookupSlug(command) {
      return input?.lookups?.[toLookupKey(command)] ?? { status: "missing" };
    },
    async recordRedirect(command) {
      state.recordedRedirects.push(command);
    },
  };

  return {
    service: new SlugService(repository),
    state,
  };
}

function toLookupKey(input: { entityType: string; slug: string }): string {
  return `${input.entityType}:${input.slug}`;
}
