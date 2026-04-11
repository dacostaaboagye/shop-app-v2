import type { Pool } from "pg";
import { AppError } from "../_core/errors/app-error.js";

export async function assertVariantCanBeArchived(
  pool: Pick<Pool, "query">,
  variantSlug: string,
): Promise<void> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM product_variants WHERE slug = $1`,
    [variantSlug],
  );
  const variantId = result.rows[0]?.id;
  if (!variantId) return;

  await assertNoActiveStock(pool, variantId, "variant");
}

export async function assertProductCanBeArchived(
  pool: Pick<Pool, "query">,
  productSlug: string,
): Promise<void> {
  const variantResult = await pool.query<{ id: string }>(
    `
      SELECT v.id
      FROM product_variants v
      JOIN catalog_products p ON p.id = v.product_id
      WHERE p.slug = $1 AND v.status = 'active'
    `,
    [productSlug],
  );

  for (const { id } of variantResult.rows) {
    await assertNoActiveStock(pool, id, "product");
  }
}

async function assertNoActiveStock(
  pool: Pick<Pool, "query">,
  variantId: string,
  entity: "variant" | "product",
): Promise<void> {
  const balanceResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM stock_balances
      WHERE sku_id = $1
        AND (on_hand_quantity > 0 OR reserved_quantity > 0)
    `,
    [variantId],
  );

  if (Number.parseInt(balanceResult.rows[0]?.count ?? "0", 10) > 0) {
    throw new AppError({
      code: "conflict",
      detail:
        entity === "variant"
          ? "This variant has active stock and cannot be archived. Adjust stock to zero first."
          : "One or more variants of this product have active stock and cannot be archived.",
      statusCode: 409,
      title: "Active stock prevents archiving",
    });
  }

  const reservationResult = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM stock_reservations
      WHERE sku_id = $1 AND status = 'active'
    `,
    [variantId],
  );

  if (Number.parseInt(reservationResult.rows[0]?.count ?? "0", 10) > 0) {
    throw new AppError({
      code: "conflict",
      detail:
        entity === "variant"
          ? "This variant has active stock reservations and cannot be archived."
          : "One or more variants of this product have active reservations and cannot be archived.",
      statusCode: 409,
      title: "Active reservations prevent archiving",
    });
  }
}
