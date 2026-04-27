import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  AdminBrandSummary,
  AdminCategorySummary,
  AdminProductDetail,
  AdminVariantSummary,
} from "@shop/contracts";
import { CatalogBrandWriteService } from "../src/modules/catalog/catalog-brand-write.service.js";
import { CatalogCategoryWriteService } from "../src/modules/catalog/catalog-category-write.service.js";
import { CatalogProductWriteService } from "../src/modules/catalog/catalog-product-write.service.js";
import type { PlatformEventRecord } from "../src/modules/events/platform-event.types.js";

const NOW = new Date("2026-04-26T21:00:00.000Z");
const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  userSlug: "catalog-admin",
} as const;

describe("Catalog write services", () => {
  it("publishes a durable event after creating a brand", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogBrandWriteService(
      {
        async createBrand() {
          return brand();
        },
        async deleteBrand() {},
        async getBrand() {
          return brand();
        },
        async updateBrand() {
          return brand();
        },
      },
      publisher(events),
    );

    await service.createBrand(
      ACTOR,
      { name: "FreshGlow", status: "active" },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.brand.created");
    assert.equal(
      events[0]?.summary,
      "Catalog brand created: FreshGlow (freshglow) is active.",
    );
  });

  it("publishes a durable event after updating a brand", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogBrandWriteService(
      {
        async createBrand() {
          return brand();
        },
        async deleteBrand() {},
        async getBrand() {
          return brand();
        },
        async updateBrand() {
          return brand({ status: "archived" });
        },
      },
      publisher(events),
    );

    await service.updateBrand(ACTOR, "freshglow", { status: "archived" }, NOW);

    assert.equal(events[0]?.type, "catalog.brand.updated");
    assert.equal(
      events[0]?.summary,
      "Catalog brand updated: FreshGlow (freshglow) is archived.",
    );
  });

  it("publishes a durable event after deleting a brand", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogBrandWriteService(
      {
        async createBrand() {
          return brand();
        },
        async deleteBrand() {},
        async getBrand() {
          return brand({ status: "archived" });
        },
        async updateBrand() {
          return brand();
        },
      },
      publisher(events),
    );

    await service.deleteBrand(ACTOR, "freshglow", NOW);

    assert.equal(events[0]?.type, "catalog.brand.deleted");
    assert.equal(
      events[0]?.summary,
      "Catalog brand deleted: FreshGlow (freshglow) was archived.",
    );
  });

  it("publishes a durable event after creating a category", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogCategoryWriteService(
      {
        async createCategory() {
          return category();
        },
        async deleteCategory() {},
        async getCategory() {
          return category();
        },
        async updateCategory() {
          return category();
        },
      },
      publisher(events),
    );

    await service.createCategory(
      ACTOR,
      {
        name: "Bath Care",
        parentCategorySlug: "personal-care",
        status: "active",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.category.created");
    assert.equal(
      events[0]?.summary,
      "Catalog category created: Bath Care (bath-care) under personal-care and is active.",
    );
  });

  it("publishes a durable event after updating a category", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogCategoryWriteService(
      {
        async createCategory() {
          return category();
        },
        async deleteCategory() {},
        async getCategory() {
          return category();
        },
        async updateCategory() {
          return category({ status: "archived" });
        },
      },
      publisher(events),
    );

    await service.updateCategory(
      ACTOR,
      "bath-care",
      { status: "archived" },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.category.updated");
    assert.equal(
      events[0]?.summary,
      "Catalog category updated: Bath Care (bath-care) under personal-care and is archived.",
    );
  });

  it("publishes a durable event after deleting a category", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogCategoryWriteService(
      {
        async createCategory() {
          return category();
        },
        async deleteCategory() {},
        async getCategory() {
          return category({ status: "archived" });
        },
        async updateCategory() {
          return category();
        },
      },
      publisher(events),
    );

    await service.deleteCategory(ACTOR, "bath-care", NOW);

    assert.equal(events[0]?.type, "catalog.category.deleted");
    assert.equal(
      events[0]?.summary,
      "Catalog category deleted: Bath Care (bath-care) under personal-care and was archived.",
    );
  });

  it("publishes a durable event after creating a product", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product();
        },
        async updateProduct() {
          return product();
        },
      },
      {
        async createVariant() {
          throw new Error("not used");
        },
        async deleteVariant() {
          throw new Error("not used");
        },
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          throw new Error("not used");
        },
      },
      publisher(events),
    );

    await service.createProduct(
      ACTOR,
      {
        brandSlug: "freshglow",
        categorySlug: "bath-care",
        isTaxable: true,
        name: "Soap Bar",
        priceIncludesTax: false,
        status: "active",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.product.created");
    assert.equal(
      events[0]?.summary,
      "Catalog product created: Soap Bar (soap-bar) in bath-care / freshglow with 2 variants.",
    );
  });

  it("publishes a durable event after updating a product", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product();
        },
        async updateProduct() {
          return product({ status: "archived" });
        },
      },
      {
        async createVariant() {
          throw new Error("not used");
        },
        async deleteVariant() {
          throw new Error("not used");
        },
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          throw new Error("not used");
        },
      },
      publisher(events),
    );

    await service.updateProduct(ACTOR, "soap-bar", { status: "archived" }, NOW);

    assert.equal(events[0]?.type, "catalog.product.updated");
    assert.equal(
      events[0]?.summary,
      "Catalog product updated: Soap Bar (soap-bar) in bath-care / freshglow with 2 variants.",
    );
  });

  it("publishes a durable event after deleting a product", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product({ status: "archived" });
        },
        async updateProduct() {
          return product();
        },
      },
      {
        async createVariant() {
          return variant();
        },
        async deleteVariant() {},
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          return variant();
        },
      },
      publisher(events),
    );

    await service.deleteProductWithActor(ACTOR, "soap-bar", NOW);

    assert.equal(events[0]?.type, "catalog.product.deleted");
    assert.equal(
      events[0]?.summary,
      "Catalog product deleted: Soap Bar (soap-bar) in bath-care / freshglow with 2 variants.",
    );
  });

  it("publishes a durable event after creating a variant", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product();
        },
        async updateProduct() {
          return product();
        },
      },
      {
        async createVariant() {
          return variant();
        },
        async deleteVariant() {},
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          return variant();
        },
      },
      publisher(events),
    );

    await service.createVariant(
      ACTOR,
      "soap-bar",
      {
        attributes: {},
        costPrice: "5.00",
        isDefault: false,
        name: "Citrus",
        sellingPrice: "7.50",
        sku: "SOAP-001",
        status: "active",
        unitOfMeasure: "piece",
      },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.variant.created");
    assert.equal(
      events[0]?.summary,
      "Catalog variant created under soap-bar: Citrus (citrus / SOAP-001) is active.",
    );
  });

  it("publishes a durable event after updating a variant", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product();
        },
        async updateProduct() {
          return product();
        },
      },
      {
        async createVariant() {
          return variant();
        },
        async deleteVariant() {},
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          return variant({ status: "archived" });
        },
      },
      publisher(events),
    );

    await service.updateVariant(
      ACTOR,
      "soap-bar",
      "citrus",
      { status: "archived" },
      NOW,
    );

    assert.equal(events[0]?.type, "catalog.variant.updated");
    assert.equal(
      events[0]?.summary,
      "Catalog variant updated under soap-bar: Citrus (citrus / SOAP-001) is archived.",
    );
  });

  it("publishes a durable event after deleting a variant", async () => {
    const events: PlatformEventRecord[] = [];
    const service = new CatalogProductWriteService(
      {
        async createProduct() {
          return product();
        },
        async deleteProduct() {},
        async getProductForDeleteEvent() {
          return product();
        },
        async updateProduct() {
          return product();
        },
      },
      {
        async createVariant() {
          return variant();
        },
        async deleteVariant() {},
        async getVariantEventContext() {
          return variantContext();
        },
        async updateVariant() {
          return variant();
        },
      },
      publisher(events),
    );

    await service.deleteVariant(ACTOR, "soap-bar", "citrus", NOW);

    assert.equal(events[0]?.type, "catalog.variant.deleted");
    assert.equal(
      events[0]?.summary,
      "Catalog variant deleted from soap-bar: Citrus (citrus / SOAP-001).",
    );
  });
});

function publisher(events: PlatformEventRecord[]) {
  return {
    async publish(event: PlatformEventRecord) {
      events.push(event);
    },
  };
}

function brand(overrides: Partial<AdminBrandSummary> = {}): AdminBrandSummary {
  return {
    createdAt: NOW.toISOString(),
    description: null,
    name: "FreshGlow",
    primaryImageUrl: null,
    slug: "freshglow",
    status: "active",
    website: null,
    ...overrides,
  };
}

function category(
  overrides: Partial<AdminCategorySummary> = {},
): AdminCategorySummary {
  return {
    createdAt: NOW.toISOString(),
    description: null,
    name: "Bath Care",
    parentCategorySlug: "personal-care",
    primaryImageUrl: null,
    slug: "bath-care",
    status: "active",
    ...overrides,
  };
}

function product(
  overrides: Partial<AdminProductDetail> = {},
): AdminProductDetail {
  return {
    archivedAt: null,
    brandSlug: "freshglow",
    categorySlug: "bath-care",
    countryOfOrigin: null,
    createdAt: NOW.toISOString(),
    description: null,
    features: [],
    isTaxable: true,
    name: "Soap Bar",
    options: [],
    priceIncludesTax: false,
    primaryImageUrl: null,
    slug: "soap-bar",
    status: "active",
    taxCategory: null,
    variantCount: 2,
    variants: [],
    ...overrides,
  };
}

function variant(
  overrides: Partial<AdminVariantSummary> = {},
): AdminVariantSummary {
  return {
    archivedAt: null,
    attributes: {},
    barcode: null,
    costPrice: "5.00",
    createdAt: NOW.toISOString(),
    customsCode: null,
    dimensionsCm: null,
    isDefault: false,
    isTaxable: null,
    manufacturerPartNumber: null,
    name: "Citrus",
    packagingType: null,
    sellingPrice: "7.50",
    sku: "SOAP-001",
    slug: "citrus",
    status: "active",
    taxCategory: null,
    unitOfMeasure: "piece",
    weightGrams: null,
    ...overrides,
  };
}

function variantContext() {
  return {
    productSlug: "soap-bar",
    sku: "SOAP-001",
    variantName: "Citrus",
    variantSlug: "citrus",
  };
}
