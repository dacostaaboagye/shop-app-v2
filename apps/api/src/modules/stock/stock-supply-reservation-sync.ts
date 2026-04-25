import type { ApiDatabase } from "../../infrastructure/database.js";
import { createPostgresStockReservationTransaction } from "./postgres-reservation-lifecycle.repository.js";
import type { SupplyRequestRow } from "./postgres-supply-request.repository.js";
import {
  confirmReservationInTransaction,
  createReservationInTransaction,
  releaseReservationInTransaction,
} from "./reservation-lifecycle.service.js";

const SUPPLY_REQUEST_RESERVATION_SOURCE_TYPE = "supply_request";

export async function reserveApprovedSupplyRequestStock(
  tx: ApiDatabase,
  input: {
    actorUserId: string;
    now: Date;
    supplyRequest: SupplyRequestRow;
  },
) {
  const quantity = input.supplyRequest.approvedQuantity;
  if (!quantity) {
    throw new Error("Approved supply request is missing approved quantity.");
  }

  const transaction = createPostgresStockReservationTransaction(tx);

  await createReservationInTransaction(transaction, {
    createdBy: input.actorUserId,
    locationId: input.supplyRequest.sourceLocationId,
    now: input.now,
    quantity,
    skuId: input.supplyRequest.skuId,
    sourceKey: input.supplyRequest.id,
    sourceType: SUPPLY_REQUEST_RESERVATION_SOURCE_TYPE,
    ttlMinutes: null,
  });
}

export async function releaseSupplyRequestStockReservation(
  tx: ApiDatabase,
  input: {
    now: Date;
    reason: string;
    supplyRequest: SupplyRequestRow;
  },
) {
  const transaction = createPostgresStockReservationTransaction(tx);
  const reservation = await transaction.findActiveReservationBySource({
    locationId: input.supplyRequest.sourceLocationId,
    skuId: input.supplyRequest.skuId,
    sourceKey: input.supplyRequest.id,
    sourceType: SUPPLY_REQUEST_RESERVATION_SOURCE_TYPE,
  });

  if (!reservation) {
    return null;
  }

  return releaseReservationInTransaction(transaction, {
    now: input.now,
    reason: input.reason,
    reservationId: reservation.id,
  });
}

export async function confirmSupplyRequestStockReservation(
  tx: ApiDatabase,
  input: {
    actorUserId: string;
    now: Date;
    supplyRequest: SupplyRequestRow;
  },
) {
  const quantity = input.supplyRequest.approvedQuantity;
  if (!quantity) {
    throw new Error("Dispatched supply request is missing approved quantity.");
  }

  const transaction = createPostgresStockReservationTransaction(tx);
  const existingReservation = await transaction.findActiveReservationBySource({
    locationId: input.supplyRequest.sourceLocationId,
    skuId: input.supplyRequest.skuId,
    sourceKey: input.supplyRequest.id,
    sourceType: SUPPLY_REQUEST_RESERVATION_SOURCE_TYPE,
  });

  const reservation =
    existingReservation ??
    (
      await createReservationInTransaction(transaction, {
        createdBy: input.actorUserId,
        locationId: input.supplyRequest.sourceLocationId,
        now: input.now,
        quantity,
        skuId: input.supplyRequest.skuId,
        sourceKey: input.supplyRequest.id,
        sourceType: SUPPLY_REQUEST_RESERVATION_SOURCE_TYPE,
        ttlMinutes: null,
      })
    ).reservation;

  return confirmReservationInTransaction(transaction, {
    now: input.now,
    reservationId: reservation.id,
  });
}
