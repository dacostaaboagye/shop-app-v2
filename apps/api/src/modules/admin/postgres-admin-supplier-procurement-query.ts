import {
  catalogProducts,
  locations,
  productVariants,
  supplierProcurementOrderLines,
  supplierProcurementOrders,
} from "@shop/database";
import { desc, eq, inArray } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

export async function listSupplierProcurementOrders(
  db: ApiDatabase,
  supplierId: string,
) {
  const orders = await db
    .select({
      approvedAt: supplierProcurementOrders.approvedAt,
      cancelledAt: supplierProcurementOrders.cancelledAt,
      createdAt: supplierProcurementOrders.createdAt,
      destinationLocationName: locations.name,
      destinationLocationSlug: locations.slug,
      expectedAt: supplierProcurementOrders.expectedAt,
      id: supplierProcurementOrders.id,
      notes: supplierProcurementOrders.notes,
      orderedAt: supplierProcurementOrders.orderedAt,
      receivedAt: supplierProcurementOrders.receivedAt,
      reference: supplierProcurementOrders.reference,
      status: supplierProcurementOrders.status,
    })
    .from(supplierProcurementOrders)
    .leftJoin(
      locations,
      eq(locations.id, supplierProcurementOrders.destinationLocationId),
    )
    .where(eq(supplierProcurementOrders.supplierId, supplierId))
    .orderBy(desc(supplierProcurementOrders.createdAt))
    .limit(20);
  const lines =
    orders.length > 0
      ? await db
          .select({
            approvedQuantity: supplierProcurementOrderLines.approvedQuantity,
            orderId: supplierProcurementOrderLines.orderId,
            productName: catalogProducts.name,
            productSlug: catalogProducts.slug,
            receivedQuantity: supplierProcurementOrderLines.receivedQuantity,
            requestedQuantity: supplierProcurementOrderLines.requestedQuantity,
            sku: productVariants.sku,
            unitCost: supplierProcurementOrderLines.unitCost,
            variantName: productVariants.name,
            variantSlug: productVariants.slug,
          })
          .from(supplierProcurementOrderLines)
          .innerJoin(
            productVariants,
            eq(productVariants.id, supplierProcurementOrderLines.skuId),
          )
          .innerJoin(
            catalogProducts,
            eq(catalogProducts.id, productVariants.productId),
          )
          .where(
            inArray(
              supplierProcurementOrderLines.orderId,
              orders.map((order) => order.id),
            ),
          )
      : [];
  const lineMap = new Map<string, typeof lines>();
  for (const line of lines) {
    lineMap.set(line.orderId, [...(lineMap.get(line.orderId) ?? []), line]);
  }

  return orders.map((order) => ({
    approvedAt: order.approvedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    destinationLocationName: order.destinationLocationName,
    destinationLocationSlug: order.destinationLocationSlug,
    expectedAt: order.expectedAt?.toISOString() ?? null,
    lines: (lineMap.get(order.id) ?? []).map((line) => ({
      approvedQuantity: line.approvedQuantity,
      productName: line.productName,
      productSlug: line.productSlug,
      receivedQuantity: line.receivedQuantity,
      requestedQuantity: line.requestedQuantity,
      sku: line.sku,
      unitCost: line.unitCost,
      variantName: line.variantName,
      variantSlug: line.variantSlug,
    })),
    notes: order.notes,
    orderedAt: order.orderedAt?.toISOString() ?? null,
    receivedAt: order.receivedAt?.toISOString() ?? null,
    reference: order.reference,
    status: order.status,
  }));
}
