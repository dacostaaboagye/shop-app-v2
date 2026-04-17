import { relations } from "drizzle-orm";
import {
  catalogBrands,
  catalogCategories,
  catalogProductOptions,
  catalogProductOptionValues,
  catalogProducts,
  productVariants,
} from "./catalog.js";
import { catalogMediaAssignments } from "./media.js";

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
