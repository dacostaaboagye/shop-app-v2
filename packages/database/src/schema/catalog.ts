import { relations, sql } from "drizzle-orm";
import { catalogMediaAssignments } from "./media.js";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns, publicUuidColumn, slugColumn } from "./common.js";
import { users } from "./identity.js";

export const catalogEntityStatusEnum = pgEnum("catalog_entity_status", [
  "active",
  "archived",
]);

export const catalogBrands = pgTable(
  "catalog_brands",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    description: text("description"),
    website: varchar("website", { length: 500 }),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [index("catalog_brands_status_idx").on(table.status)],
);

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    parentCategoryId: uuid("parent_category_id"),
    path: text("path").default("").notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index("catalog_categories_parent_idx").on(table.parentCategoryId),
    index("catalog_categories_status_idx").on(table.status),
    uniqueIndex("catalog_categories_name_per_parent_unique").on(
      table.parentCategoryId,
      table.name,
    ),
  ],
);

export const catalogProducts = pgTable(
  "catalog_products",
  {
    id: publicUuidColumn(),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => catalogCategories.id),
    brandId: uuid("brand_id").references(() => catalogBrands.id),
    countryOfOrigin: varchar("country_of_origin", { length: 2 }),
    isTaxable: boolean("is_taxable").default(true).notNull(),
    taxCategory: varchar("tax_category", { length: 80 }),
    priceIncludesTax: boolean("price_includes_tax").default(false).notNull(),
    features: jsonb("features")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("catalog_products_category_idx").on(table.categoryId),
    index("catalog_products_brand_idx").on(table.brandId),
    index("catalog_products_status_idx").on(table.status),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: publicUuidColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProducts.id),
    slug: slugColumn().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 80 }).notNull().unique(),
    barcode: varchar("barcode", { length: 80 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 40 }).notNull(),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
    sellingPrice: numeric("selling_price", {
      precision: 12,
      scale: 2,
    }).notNull(),
    attributes: jsonb("attributes")
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    weightGrams: integer("weight_grams"),
    dimensionsCm: jsonb("dimensions_cm")
      .$type<{
        length?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
      }>()
      .default(sql`'{}'::jsonb`),
    packagingType: varchar("packaging_type", { length: 80 }),
    manufacturerPartNumber: varchar("manufacturer_part_number", { length: 80 }),
    customsCode: varchar("customs_code", { length: 80 }),
    isTaxable: boolean("is_taxable"),
    taxCategory: varchar("tax_category", { length: 80 }),
    isDefault: boolean("is_default").default(false).notNull(),
    status: catalogEntityStatusEnum("status").default("active").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index("product_variants_product_idx").on(table.productId),
    index("product_variants_status_idx").on(table.status),
    uniqueIndex("product_variants_barcode_unique")
      .on(table.barcode)
      .where(sql`${table.barcode} IS NOT NULL`),
    uniqueIndex("product_variants_default_per_product_unique")
      .on(table.productId)
      .where(sql`${table.isDefault} = true`),
    check(
      "product_variants_cost_price_nonnegative",
      sql`${table.costPrice} >= 0`,
    ),
    check(
      "product_variants_selling_price_nonnegative",
      sql`${table.sellingPrice} >= 0`,
    ),
  ],
);

export const catalogProductOptions = pgTable(
  "catalog_product_options",
  {
    id: publicUuidColumn(),
    productId: uuid("product_id")
      .notNull()
      .references(() => catalogProducts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    position: integer("position").default(0).notNull(),
    ...auditColumns,
  },
  (table) => [
    index("catalog_product_options_product_idx").on(table.productId),
    uniqueIndex("catalog_product_options_name_per_product_unique").on(
      table.productId,
      table.name,
    ),
  ],
);

export const catalogProductOptionValues = pgTable(
  "catalog_product_option_values",
  {
    id: publicUuidColumn(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => catalogProductOptions.id, { onDelete: "cascade" }),
    value: varchar("value", { length: 80 }).notNull(),
    position: integer("position").default(0).notNull(),
    ...auditColumns,
  },
  (table) => [
    index("catalog_product_option_values_option_idx").on(table.optionId),
    uniqueIndex("catalog_product_option_values_unique").on(
      table.optionId,
      table.value,
    ),
  ],
);

// --- Relations ---

export const catalogBrandsRelations = relations(catalogBrands, ({ many }) => ({
  products: many(catalogProducts),
  mediaAssignments: many(catalogMediaAssignments, {
    relationName: "brand_media",
  }),
}));

export const catalogCategoriesRelations = relations(
  catalogCategories,
  ({ many, one }) => ({
    parentCategory: one(catalogCategories, {
      fields: [catalogCategories.parentCategoryId],
      references: [catalogCategories.id],
      relationName: "category_hierarchy",
    }),
    childCategories: many(catalogCategories, {
      relationName: "category_hierarchy",
    }),
    products: many(catalogProducts),
    mediaAssignments: many(catalogMediaAssignments, {
      relationName: "category_media",
    }),
  }),
);

export const catalogProductsRelations = relations(
  catalogProducts,
  ({ many, one }) => ({
    brand: one(catalogBrands, {
      fields: [catalogProducts.brandId],
      references: [catalogBrands.id],
    }),
    category: one(catalogCategories, {
      fields: [catalogProducts.categoryId],
      references: [catalogCategories.id],
    }),
    options: many(catalogProductOptions),
    variants: many(productVariants),
    mediaAssignments: many(catalogMediaAssignments, {
      relationName: "product_media",
    }),
  }),
);

export const productVariantsRelations = relations(
  productVariants,
  ({ many, one }) => ({
    product: one(catalogProducts, {
      fields: [productVariants.productId],
      references: [catalogProducts.id],
    }),
    mediaAssignments: many(catalogMediaAssignments, {
      relationName: "variant_media",
    }),
  }),
);

export const catalogProductOptionsRelations = relations(
  catalogProductOptions,
  ({ many, one }) => ({
    product: one(catalogProducts, {
      fields: [catalogProductOptions.productId],
      references: [catalogProducts.id],
    }),
    values: many(catalogProductOptionValues),
  }),
);

export const catalogProductOptionValuesRelations = relations(
  catalogProductOptionValues,
  ({ one }) => ({
    option: one(catalogProductOptions, {
      fields: [catalogProductOptionValues.optionId],
      references: [catalogProductOptions.id],
    }),
  }),
);
