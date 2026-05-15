import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AdminCreateBrandRequest,
  AdminCreateCategoryRequest,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import type { CatalogReferenceImportRepository } from "../src/modules/catalog/catalog-reference-import.repository.js";
import { CatalogReferenceImportService } from "../src/modules/catalog/catalog-reference-import.service.js";

const now = new Date("2026-05-03T12:00:00.000Z");
const actor = { userId: "usr_123", userSlug: "admin-user" };

describe("CatalogReferenceImportService", () => {
  it("imports brands and skips existing names", async () => {
    const created: AdminCreateBrandRequest[] = [];
    const service = new CatalogReferenceImportService(
      createRepo({ existingBrandNames: new Set(["existing brand"]) }),
      {
        async createBrand(_actor, payload) {
          created.push(payload);
          return {
            ...payload,
            createdAt: now.toISOString(),
            primaryImageUrl: null,
            slug: payload.name.toLowerCase().replaceAll(" ", "-"),
          };
        },
      },
      {
        async createCategory() {
          throw new Error("not used");
        },
      },
    );

    const result = await service.importBrands({
      actor,
      csv: ["name,status", "New Brand,active", "Existing Brand,active"].join(
        "\n",
      ),
      fileName: "brands.csv",
      now,
    });

    assert.equal(result.summary.importedRows, 1);
    assert.equal(result.failedRows[0]?.errors[0]?.code, "existing_name");
    assert.equal(created[0]?.name, "New Brand");
  });

  it("imports categories and reports service failures by row", async () => {
    const created: AdminCreateCategoryRequest[] = [];
    const service = new CatalogReferenceImportService(
      createRepo({ existingCategoryKeys: new Set(["footwear:running"]) }),
      {
        async createBrand() {
          throw new Error("not used");
        },
      },
      {
        async createCategory(_actor, payload) {
          if (payload.parentCategorySlug === "missing") {
            throw new AppError({
              code: "not_found",
              detail: "parent missing",
              statusCode: 404,
              title: "Parent category not found",
            });
          }
          created.push(payload);
          return {
            ...payload,
            createdAt: now.toISOString(),
            primaryImageUrl: null,
            slug: payload.name.toLowerCase().replaceAll(" ", "-"),
          };
        },
      },
    );

    const result = await service.importCategories({
      actor,
      csv: [
        "name,parentCategorySlug,status",
        "Boots,,active",
        "Running,footwear,active",
        "Sandals,missing,active",
      ].join("\n"),
      fileName: "categories.csv",
      now,
    });

    assert.equal(result.summary.importedRows, 1);
    assert.deepEqual(
      result.failedRows.map((row) => row.errors[0]?.code),
      ["existing_name", "invalid_value"],
    );
    assert.equal(created[0]?.name, "Boots");
  });

  it("does not convert infrastructure failures into row failures", async () => {
    const service = new CatalogReferenceImportService(
      createRepo({}),
      {
        async createBrand() {
          throw new Error("event publisher unavailable after write");
        },
      },
      {
        async createCategory() {
          throw new Error("not used");
        },
      },
    );

    await assert.rejects(
      () =>
        service.importBrands({
          actor,
          csv: "name,status\nNew Brand,active",
          fileName: "brands.csv",
          now,
        }),
      /event publisher unavailable after write/,
    );
  });
});

function createRepo(input: {
  existingBrandNames?: Set<string>;
  existingCategoryKeys?: Set<string>;
}): CatalogReferenceImportRepository {
  return {
    async findExistingBrandNames() {
      return input.existingBrandNames ?? new Set();
    },
    async findExistingCategoryKeys() {
      return input.existingCategoryKeys ?? new Set();
    },
  };
}
