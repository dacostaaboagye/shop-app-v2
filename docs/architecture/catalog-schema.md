# Catalog Schema

`E-03-01` establishes the product-catalog persistence foundation.

## Inventory identity

Catalog products are presentation-level groupings. Stock-bearing quantity still
attaches to the SKU-bearing variant, so stock, reservations, ownership, and
delivery items continue to compose on `product_variants.id`.

## `catalog_categories`

Hierarchical product grouping.

- `slug`: public category identifier for URLs and filters
- `parent_category_id`: optional self-reference for nested categories
- `status`: `active` or `archived`

Notes:

- category names are unique only within the same parent
- later browse and filter surfaces should use category slugs, never raw IDs

## `catalog_products`

Product shell shared by one or more variants.

- `slug`: public product identifier
- `name`: customer- and operator-facing product name
- `category_id`: optional category assignment
- `description`: operator-maintained descriptive copy
- `status`: `active` or `archived`

Notes:

- product-level status controls whether the shell is available for search and
  browse
- SKU, barcode, and price do not live on the product row

## `product_variants`

Stock-bearing sellable variant.

- `product_id`: owning product shell
- `slug`: public variant identifier for future detail routes
- `sku`: globally unique stock-bearing code
- `barcode`: nullable globally unique barcode when present
- `unit_of_measure`: free-form unit label such as `kg`, `pack`, or `unit`
- `cost_price`, `selling_price`: non-negative decimal prices
- `attributes`: JSON object for defining dimensions like size, colour, or
  weight
- `is_default`: one variant per product may be the default display variant
- `status`: `active` or `archived`

Constraints:

- one default variant per product at most
- SKU uniqueness is global across the catalogue
- barcode uniqueness is global when a barcode exists

## Current scope

This foundation intentionally stops at the core catalogue identity model needed
by `E-03-01`.

Later tickets extend this base with:

- bulk import orchestration for `E-03-02`
- search and browse read models for `E-03-03`
- product and variant media for `E-03-04`
- supplier-to-variant linkage for `E-03-05`
- immutable catalogue audit history for `E-03-06` and `E-03-07`
