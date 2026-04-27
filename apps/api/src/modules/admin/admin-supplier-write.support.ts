import type { AdminSupplierDetail } from "@shop/contracts";

export function findSupplierContact(
  supplier: AdminSupplierDetail | null,
  contactReference: string,
) {
  return supplier?.contacts?.find(
    (contact) => contact.contactReference === contactReference,
  );
}

export function findSupplierProduct(
  supplier: AdminSupplierDetail | null,
  productSlug: string,
) {
  return supplier?.products?.find(
    (product) => product.productSlug === productSlug,
  );
}

export function findSupplierProcurementOrder(
  supplier: AdminSupplierDetail | null,
  reference: string,
) {
  return supplier?.procurementOrders?.find(
    (order) => order.reference === reference,
  );
}

export function toSupplierProcurementEventContext(
  supplier: AdminSupplierDetail,
  order: NonNullable<AdminSupplierDetail["procurementOrders"]>[number],
) {
  const totalApprovedQuantity = order.lines.reduce(
    (sum, line) => sum + (line.approvedQuantity ?? 0),
    0,
  );
  const totalReceivedQuantity = order.lines.reduce(
    (sum, line) => sum + line.receivedQuantity,
    0,
  );
  const totalRequestedQuantity = order.lines.reduce(
    (sum, line) => sum + line.requestedQuantity,
    0,
  );

  return {
    destinationLocationName: order.destinationLocationName,
    destinationLocationSlug: order.destinationLocationSlug,
    lineCount: order.lines.length,
    notes: order.notes,
    reference: order.reference,
    status: order.status,
    supplierName: supplier.name,
    supplierSlug: supplier.slug,
    totalApprovedQuantity,
    totalReceivedQuantity,
    totalRequestedQuantity,
  };
}
