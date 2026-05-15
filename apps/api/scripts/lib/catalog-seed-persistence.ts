import type { PoolClient } from "@neondatabase/serverless";
import type { SeedBrand, SeedCategory, SeedOption, SeedProduct, SeedVariant } from "./catalog-seed-types.js";

type PgClient = PoolClient;
export async function upsertCategory(
  client: PgClient,
  category: SeedCategory,
  now: Date,
): Promise<string> {
  const parent = category.parentSlug
    ? await selectIdAndPath(client, category.parentSlug)
    : null;
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO catalog_categories (
        id, slug, name, description, parent_category_id, path, status, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, '', 'active', $5, $5)
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            parent_category_id = EXCLUDED.parent_category_id,
            status = 'active',
            updated_at = EXCLUDED.updated_at
      RETURNING id
    `,
    [category.slug, category.name, category.description, parent?.id ?? null, now],
  );
  const categoryId = result.rows[0]?.id;

  if (!categoryId) {
    throw new Error(`Unable to upsert category "${category.slug}".`);
  }
  const path = parent ? `${parent.path}/${categoryId}` : categoryId;
  await client.query(
    `
      UPDATE catalog_categories
      SET path = $2, updated_at = $3
      WHERE id = $1
    `,
    [categoryId, path, now],
  );

  return categoryId;
}

export async function upsertBrand(
  client: PgClient,
  brand: SeedBrand,
  now: Date,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO catalog_brands (
        id, slug, name, description, website, status, created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $5)
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            website = EXCLUDED.website,
            status = 'active',
            updated_at = EXCLUDED.updated_at
      RETURNING id
    `,
    [brand.slug, brand.name, brand.description, brand.website, now],
  );
  const brandId = result.rows[0]?.id;

  if (!brandId) {
    throw new Error(`Unable to upsert brand "${brand.slug}".`);
  }
  return brandId;
}

export async function upsertProduct(
  client: PgClient,
  product: SeedProduct,
  categoryId: string,
  brandId: string,
  now: Date,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO catalog_products (
        id, slug, name, description, category_id, brand_id, country_of_origin,
        is_taxable, tax_category, price_includes_tax, features, status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10::jsonb, 'active', $11, $11
      )
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            brand_id = EXCLUDED.brand_id,
            country_of_origin = EXCLUDED.country_of_origin,
            is_taxable = EXCLUDED.is_taxable,
            tax_category = EXCLUDED.tax_category,
            price_includes_tax = EXCLUDED.price_includes_tax,
            features = EXCLUDED.features,
            status = 'active',
            archived_at = NULL,
            updated_at = EXCLUDED.updated_at
      RETURNING id
    `,
    [
      product.slug,
      product.name,
      product.description,
      categoryId,
      brandId,
      product.countryOfOrigin,
      product.isTaxable,
      product.taxCategory,
      product.priceIncludesTax,
      JSON.stringify(product.features),
      now,
    ],
  );
  const productId = result.rows[0]?.id;

  if (!productId) {
    throw new Error(`Unable to upsert product "${product.slug}".`);
  }

  return productId;
}

export async function upsertProductOptions(
  client: PgClient,
  productId: string,
  options: SeedOption[],
  now: Date,
): Promise<void> {
  for (const [index, option] of options.entries()) {
    const optionResult = await client.query<{ id: string }>(
      `
        INSERT INTO catalog_product_options (
          id, product_id, name, position, created_at, updated_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $4)
        ON CONFLICT (product_id, name) DO UPDATE
          SET position = EXCLUDED.position,
              updated_at = EXCLUDED.updated_at
        RETURNING id
      `,
      [productId, option.name, index, now],
    );
    const optionId = optionResult.rows[0]?.id;

    if (!optionId) {
      throw new Error(`Unable to upsert option "${option.name}".`);
    }

    for (const [valueIndex, value] of option.values.entries()) {
      await client.query(
        `
          INSERT INTO catalog_product_option_values (
            id, option_id, value, position, created_at, updated_at
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $4)
          ON CONFLICT (option_id, value) DO UPDATE
            SET position = EXCLUDED.position,
                updated_at = EXCLUDED.updated_at
        `,
        [optionId, value, valueIndex, now],
      );
    }
  }
}

export async function upsertVariants(
  client: PgClient,
  productId: string,
  variants: SeedVariant[],
  now: Date,
): Promise<void> {
  await client.query(
    `
      UPDATE product_variants
      SET is_default = false, updated_at = $2
      WHERE product_id = $1
    `,
    [productId, now],
  );

  for (const variant of variants) {
    await client.query(
      `
        INSERT INTO product_variants (
          id, product_id, slug, name, sku, barcode, unit_of_measure, cost_price,
          selling_price, attributes, weight_grams, dimensions_cm, packaging_type,
          manufacturer_part_number, customs_code, is_taxable, tax_category, is_default,
          status, archived_at, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
          $8, $9::jsonb, $10, $11::jsonb, $12,
          $13, $14, true, 'bags', $15,
          'active', NULL, $16, $16
        )
        ON CONFLICT (sku) DO UPDATE
          SET product_id = EXCLUDED.product_id,
              slug = EXCLUDED.slug,
              name = EXCLUDED.name,
              barcode = EXCLUDED.barcode,
              unit_of_measure = EXCLUDED.unit_of_measure,
              cost_price = EXCLUDED.cost_price,
              selling_price = EXCLUDED.selling_price,
              attributes = EXCLUDED.attributes,
              weight_grams = EXCLUDED.weight_grams,
              dimensions_cm = EXCLUDED.dimensions_cm,
              packaging_type = EXCLUDED.packaging_type,
              manufacturer_part_number = EXCLUDED.manufacturer_part_number,
              customs_code = EXCLUDED.customs_code,
              is_taxable = EXCLUDED.is_taxable,
              tax_category = EXCLUDED.tax_category,
              is_default = EXCLUDED.is_default,
              status = 'active',
              archived_at = NULL,
              updated_at = EXCLUDED.updated_at
      `,
      [
        productId,
        variant.slug,
        variant.name,
        variant.sku,
        variant.barcode,
        variant.unitOfMeasure,
        variant.costPrice,
        variant.sellingPrice,
        JSON.stringify(variant.attributes),
        variant.weightGrams,
        JSON.stringify(variant.dimensionsCm),
        variant.packagingType,
        variant.manufacturerPartNumber,
        variant.customsCode,
        variant.isDefault,
        now,
      ],
    );
  }
}

async function selectIdAndPath(
  client: PgClient,
  slug: string,
): Promise<{ id: string; path: string } | null> {
  const result = await client.query<{ id: string; path: string }>(
    `
      SELECT id, path
      FROM catalog_categories
      WHERE slug = $1
    `,
    [slug],
  );

  return result.rows[0] ?? null;
}
