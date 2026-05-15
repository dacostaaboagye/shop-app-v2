import type { ManagerHandoverLane } from "@shop/contracts";
import { sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "../catalog/catalog-primary-image.loader.js";

export type ManagerHandoverRow = {
  canRevert: boolean;
  currentWorkerName: string;
  currentWorkerSlug: string;
  fromWorkerId: string;
  fromWorkerName: string;
  fromWorkerSlug: string;
  handoverChainId: string;
  lane: ManagerHandoverLane;
  latestEventType: "handover_out" | "handover_in" | "reverted" | "cancelled";
  locationId: string;
  locationName: string;
  primaryImageUrl: string | null;
  productName: string;
  productSlug: string;
  quantity: number;
  sku: string;
  skuId: string;
  startedAt: Date;
  toWorkerName: string;
  toWorkerSlug: string;
  updatedAt: Date;
  variantName: string;
  variantSlug: string;
};

type ManagerHandoverQueryRow = Omit<
  ManagerHandoverRow,
  "canRevert" | "lane" | "primaryImageUrl" | "quantity"
> & {
  quantity: number | string;
};

export class PostgresManagerHandoverQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async listLocationHandovers(input: {
    locationId: string;
  }): Promise<ManagerHandoverRow[]> {
    return this.queryManagerHandovers(input);
  }

  async getManagerHandoverChain(input: {
    handoverChainId: string;
  }): Promise<ManagerHandoverRow | null> {
    const rows = await this.queryManagerHandovers(input);
    return rows[0] ?? null;
  }

  private async queryManagerHandovers(input: {
    handoverChainId?: string;
    locationId?: string;
  }): Promise<ManagerHandoverRow[]> {
    const locationFilter = input.locationId
      ? sql`AND soe.location_id = ${input.locationId}`
      : sql``;
    const chainFilter = input.handoverChainId
      ? sql`AND soe.handover_chain_id = ${input.handoverChainId}`
      : sql``;

    const result = await this.db.execute<ManagerHandoverQueryRow>(sql`
      WITH scoped_chains AS (
        SELECT DISTINCT soe.handover_chain_id
        FROM stock_ownership_events soe
        WHERE soe.handover_chain_id IS NOT NULL
          ${locationFilter}
          ${chainFilter}
      ),
      first_out AS (
        SELECT DISTINCT ON (soe.handover_chain_id)
          soe.handover_chain_id,
          soe.worker_id,
          soe.effective_from
        FROM stock_ownership_events soe
        JOIN scoped_chains sc
          ON sc.handover_chain_id = soe.handover_chain_id
        WHERE soe.event_type = 'handover_out'
        ORDER BY soe.handover_chain_id, soe.effective_from ASC, soe.created_at ASC, soe.id ASC
      ),
      first_in AS (
        SELECT DISTINCT ON (soe.handover_chain_id)
          soe.handover_chain_id,
          soe.worker_id
        FROM stock_ownership_events soe
        JOIN scoped_chains sc
          ON sc.handover_chain_id = soe.handover_chain_id
        WHERE soe.event_type = 'handover_in'
        ORDER BY soe.handover_chain_id, soe.effective_from ASC, soe.created_at ASC, soe.id ASC
      ),
      latest AS (
        SELECT DISTINCT ON (soe.handover_chain_id)
          soe.handover_chain_id,
          soe.event_type,
          soe.location_id,
          soe.quantity,
          soe.sku_id,
          soe.worker_id,
          soe.effective_from
        FROM stock_ownership_events soe
        JOIN scoped_chains sc
          ON sc.handover_chain_id = soe.handover_chain_id
        ORDER BY soe.handover_chain_id, soe.effective_from DESC, soe.created_at DESC, soe.id DESC
      )
      SELECT
        latest.handover_chain_id AS "handoverChainId",
        latest.event_type AS "latestEventType",
        latest.location_id AS "locationId",
        latest.quantity AS "quantity",
        latest.sku_id AS "skuId",
        latest.effective_from AS "updatedAt",
        first_out.worker_id AS "fromWorkerId",
        first_out.effective_from AS "startedAt",
        locations.name AS "locationName",
        product_variants.sku AS "sku",
        product_variants.name AS "variantName",
        product_variants.slug AS "variantSlug",
        catalog_products.name AS "productName",
        catalog_products.slug AS "productSlug",
        trim(concat(from_user.first_name, ' ', from_user.last_name)) AS "fromWorkerName",
        from_user.slug AS "fromWorkerSlug",
        trim(concat(to_user.first_name, ' ', to_user.last_name)) AS "toWorkerName",
        to_user.slug AS "toWorkerSlug",
        trim(concat(current_user.first_name, ' ', current_user.last_name)) AS "currentWorkerName",
        current_user.slug AS "currentWorkerSlug"
      FROM latest
      JOIN first_out ON first_out.handover_chain_id = latest.handover_chain_id
      JOIN first_in ON first_in.handover_chain_id = latest.handover_chain_id
      JOIN locations ON locations.id = latest.location_id
      JOIN product_variants ON product_variants.id = latest.sku_id
      JOIN catalog_products ON catalog_products.id = product_variants.product_id
      JOIN users from_user ON from_user.id = first_out.worker_id
      JOIN users to_user ON to_user.id = first_in.worker_id
      JOIN users current_user ON current_user.id = latest.worker_id
      ORDER BY latest.effective_from DESC
    `);

    const primaryImageUrls = await listPrimaryImageUrls(
      this.db,
      "product",
      result.rows.map((row) => row.productSlug),
    );

    return result.rows.map((row) => ({
      canRevert: row.latestEventType === "handover_in",
      currentWorkerName: row.currentWorkerName,
      currentWorkerSlug: row.currentWorkerSlug,
      fromWorkerId: row.fromWorkerId,
      fromWorkerName: row.fromWorkerName,
      fromWorkerSlug: row.fromWorkerSlug,
      handoverChainId: row.handoverChainId,
      lane: classifyManagerHandover(row),
      latestEventType: row.latestEventType,
      locationId: row.locationId,
      locationName: row.locationName,
      primaryImageUrl: primaryImageUrls.get(row.productSlug) ?? null,
      productName: row.productName,
      productSlug: row.productSlug,
      quantity: Number(row.quantity),
      sku: row.sku,
      skuId: row.skuId,
      startedAt: toDate(row.startedAt),
      toWorkerName: row.toWorkerName,
      toWorkerSlug: row.toWorkerSlug,
      updatedAt: toDate(row.updatedAt),
      variantName: row.variantName,
      variantSlug: row.variantSlug,
    }));
  }
}

function classifyManagerHandover(
  row: ManagerHandoverQueryRow,
): ManagerHandoverLane {
  if (row.latestEventType === "handover_in") {
    return "active";
  }

  return row.latestEventType === "reverted" ? "reverted" : "history";
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
