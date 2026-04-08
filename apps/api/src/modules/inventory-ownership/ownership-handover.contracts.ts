import { AppError } from "../_core/errors/app-error.js";
import type { OwnershipEventRecord } from "./ownership-query.service.js";

export interface OwnershipHandoverRepository {
  findExpiredActiveHandoverChainIds(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<string[]>;
  getLatestChainEvent(
    handoverChainId: string,
  ): Promise<OwnershipEventRecord | null>;
  getOriginalWorkerForChain(handoverChainId: string): Promise<string | null>;
  insertHandoverPair(input: {
    createdBy: string;
    effectiveFrom: Date;
    fromWorkerId: string;
    handoverChainId: string;
    locationId: string;
    skuId: string;
    quantity: number;
    toWorkerId: string;
  }): Promise<{
    handoverInEvent: OwnershipEventRecord;
    handoverOutEvent: OwnershipEventRecord;
  }>;
  insertRevertedEvent(input: {
    createdBy: string;
    effectiveFrom: Date;
    handoverChainId: string;
    locationId: string;
    skuId: string;
    quantity: number;
    workerId: string;
  }): Promise<OwnershipEventRecord>;
}

export class MissingHandoverChainError extends AppError {
  constructor(handoverChainId: string) {
    super({
      code: "not_found",
      detail: `No handover chain exists for ${handoverChainId}.`,
      details: { handoverChainId },
      statusCode: 404,
      title: "Handover chain not found",
    });
  }
}

export class OwnershipStateConflictError extends AppError {
  constructor(detail: string, details?: Record<string, unknown>) {
    super({
      code: "conflict",
      detail,
      ...(details ? { details } : {}),
      statusCode: 409,
      title: "Ownership state conflict",
    });
  }
}
