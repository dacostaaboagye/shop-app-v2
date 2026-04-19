import { sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type WorkerAssignmentRow = {
  availableQuantity: number;
  effectiveFrom: Date;
  locationId: string;
  onHandQuantity: number;
  productName: string;
  productSlug: string;
  quantity: number;
  sellingPrice: string;
  sku: string;
  skuId: string;
  variantName: string;
  variantSlug: string;
  workerId: string;
};

export type LocationAssignmentRow = {
  effectiveFrom: Date;
  eventType: string;
  productName: string;
  quantity: number;
  sku: string;
  skuId: string;
  variantName: string;
  workerEmail: string;
  workerId: string;
  workerName: string;
};

export type LocationStaffRow = {
  activeAssignmentCount: number;
  assignedAt: Date;
  email: string;
  firstName: string;
  lastName: string;
  locationName: string;
  roleName: string;
  roleSlug: "manager" | "worker";
  status: "active" | "deactivated" | "suspended";
  userId: string;
  userSlug: string;
};

export class PostgresWorkerAssignmentQueryRepository {
  constructor(private readonly db: ApiDatabase) {}

  async getWorkerAssignments(input: {
    locationId: string;
    workerId: string;
  }): Promise<WorkerAssignmentRow[]> {
    const result = await this.db.execute<{
      available_quantity: number;
      effective_from: Date;
      location_id: string;
      on_hand_quantity: number;
      product_name: string;
      product_slug: string;
      quantity: number;
      selling_price: string;
      sku: string;
      sku_id: string;
      variant_name: string;
      variant_slug: string;
      worker_id: string;
    }>(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (sku_id, location_id)
          id, sku_id, location_id, worker_id, event_type, quantity, effective_from, handover_chain_id
        FROM stock_ownership_events
        WHERE location_id = ${input.locationId}
        ORDER BY sku_id, location_id, effective_from DESC
      )
      SELECT
        le.sku_id,
        le.location_id,
        le.worker_id,
        le.quantity,
        le.effective_from,
        pv.sku,
        pv.name AS variant_name,
        pv.slug AS variant_slug,
        pv.selling_price,
        cp.name AS product_name,
        cp.slug AS product_slug,
        COALESCE(sb.on_hand_quantity, 0) AS on_hand_quantity,
        GREATEST(COALESCE(sb.on_hand_quantity, 0) - COALESCE(sb.reserved_quantity, 0), 0) AS available_quantity
      FROM latest_events le
      INNER JOIN product_variants pv ON pv.id = le.sku_id
      INNER JOIN catalog_products cp ON cp.id = pv.product_id
      LEFT JOIN stock_balances sb
        ON sb.sku_id = le.sku_id AND sb.location_id = le.location_id
      WHERE le.worker_id = ${input.workerId}
        AND le.event_type IN ('assigned', 'reassigned', 'handover_in')
      ORDER BY le.effective_from DESC
    `);

    return result.rows.map((row) => ({
      availableQuantity: Number(row.available_quantity),
      effectiveFrom: new Date(row.effective_from),
      locationId: row.location_id,
      onHandQuantity: Number(row.on_hand_quantity),
      productName: row.product_name,
      productSlug: row.product_slug,
      quantity: row.quantity,
      sellingPrice: row.selling_price,
      sku: row.sku,
      skuId: row.sku_id,
      variantName: row.variant_name,
      variantSlug: row.variant_slug,
      workerId: row.worker_id,
    }));
  }

  async getLocationAssignments(
    locationId: string,
  ): Promise<LocationAssignmentRow[]> {
    const result = await this.db.execute<{
      effective_from: Date;
      event_type: string;
      product_name: string;
      quantity: number;
      sku: string;
      sku_id: string;
      variant_name: string;
      worker_email: string;
      worker_id: string;
      worker_name: string;
    }>(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (sku_id, location_id)
          id, sku_id, location_id, worker_id, event_type, quantity, effective_from
        FROM stock_ownership_events
        WHERE location_id = ${locationId}
        ORDER BY sku_id, location_id, effective_from DESC
      )
      SELECT
        le.sku_id,
        le.worker_id,
        le.event_type,
        le.quantity,
        le.effective_from,
        pv.sku,
        pv.name AS variant_name,
        cp.name AS product_name,
        CONCAT(u.first_name, ' ', u.last_name) AS worker_name,
        u.email AS worker_email
      FROM latest_events le
      INNER JOIN product_variants pv ON pv.id = le.sku_id
      INNER JOIN catalog_products cp ON cp.id = pv.product_id
      INNER JOIN users u ON u.id = le.worker_id
      WHERE le.event_type IN ('assigned', 'reassigned', 'handover_in')
      ORDER BY le.effective_from DESC
    `);

    return result.rows.map((row) => ({
      effectiveFrom: new Date(row.effective_from),
      eventType: row.event_type,
      productName: row.product_name,
      quantity: row.quantity,
      sku: row.sku,
      skuId: row.sku_id,
      variantName: row.variant_name,
      workerEmail: row.worker_email,
      workerId: row.worker_id,
      workerName: row.worker_name,
    }));
  }

  async getLocationStaff(locationId: string): Promise<LocationStaffRow[]> {
    const result = await this.db.execute<{
      active_assignment_count: number;
      assigned_at: Date;
      email: string;
      first_name: string;
      last_name: string;
      location_name: string;
      role_name: string;
      role_slug: "manager" | "worker";
      status: "active" | "deactivated" | "suspended";
      user_id: string;
      user_slug: string;
    }>(sql`
      WITH current_assignment_counts AS (
        WITH latest_events AS (
          SELECT DISTINCT ON (sku_id, location_id)
            sku_id,
            location_id,
            worker_id,
            event_type
          FROM stock_ownership_events
          WHERE location_id = ${locationId}
          ORDER BY sku_id, location_id, effective_from DESC, created_at DESC, id DESC
        )
        SELECT
          worker_id,
          cast(count(*) as int) AS active_assignment_count
        FROM latest_events
        WHERE event_type IN ('assigned', 'reassigned', 'handover_in')
        GROUP BY worker_id
      )
      SELECT
        ur.user_id,
        u.slug AS user_slug,
        u.first_name,
        u.last_name,
        u.email,
        u.status,
        r.slug AS role_slug,
        r.name AS role_name,
        ur.assigned_at,
        l.name AS location_name,
        COALESCE(cac.active_assignment_count, 0) AS active_assignment_count
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN locations l ON l.id = ur.location_id
      LEFT JOIN current_assignment_counts cac ON cac.worker_id = ur.user_id
      WHERE ur.location_id = ${locationId}
        AND ur.revoked_at IS NULL
        AND r.slug IN ('manager', 'worker')
      ORDER BY
        CASE r.slug WHEN 'manager' THEN 0 ELSE 1 END,
        u.first_name ASC,
        u.last_name ASC,
        u.email ASC
    `);

    return result.rows.map((row) => ({
      activeAssignmentCount: Number(row.active_assignment_count),
      assignedAt: new Date(row.assigned_at),
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      locationName: row.location_name,
      roleName: row.role_name,
      roleSlug: row.role_slug,
      status: row.status,
      userId: row.user_id,
      userSlug: row.user_slug,
    }));
  }
}
