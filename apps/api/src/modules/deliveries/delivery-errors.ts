import { DELIVERY_ERROR_CODES } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export type DeliveryShortfallEntry = {
  skuId: string;
  requested: number;
  available: number;
};

export class DeliverySourceNotFoundError extends AppError {
  constructor(input: { sourceType: string; sourceReference: string }) {
    super({
      code: "not_found",
      statusCode: 404,
      title: "Delivery source not found",
      detail: `No ${input.sourceType} found for reference ${input.sourceReference}.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.sourceNotFound,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      },
    });
    this.name = "DeliverySourceNotFoundError";
  }
}

export class DeliverySourceStateInvalidError extends AppError {
  constructor(input: {
    sourceType: string;
    sourceReference: string;
    state: string;
  }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Delivery source not eligible",
      detail: `${input.sourceType} ${input.sourceReference} is in state "${input.state}" and cannot produce a delivery.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.invalidSourceState,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        sourceState: input.state,
      },
    });
    this.name = "DeliverySourceStateInvalidError";
  }
}

export class DeliverySourceConflictError extends AppError {
  constructor(input: { sourceType: string; sourceReference: string }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Delivery source already used",
      detail: `A delivery already exists for ${input.sourceType} ${input.sourceReference} but the request items do not match the existing delivery.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.sourceConflict,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      },
    });
    this.name = "DeliverySourceConflictError";
  }
}

export class DeliveryInsufficientOriginStockError extends AppError {
  constructor(input: {
    sourceType: string;
    sourceReference: string;
    locationId: string;
    shortfalls: DeliveryShortfallEntry[];
  }) {
    super({
      code: "conflict",
      statusCode: 409,
      title: "Insufficient origin stock for delivery",
      detail: `Origin location ${input.locationId} cannot satisfy ${input.shortfalls.length} item(s) for ${input.sourceType} ${input.sourceReference}.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.insufficientOriginStock,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        locationId: input.locationId,
        shortfalls: input.shortfalls,
      },
    });
    this.name = "DeliveryInsufficientOriginStockError";
  }
}

export class DeliveryInvalidDestinationError extends AppError {
  constructor(input: { reason: string; sourceType?: string }) {
    super({
      code: "validation_error",
      statusCode: 400,
      title: "Invalid delivery destination",
      detail: input.reason,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.invalidDestination,
        sourceType: input.sourceType ?? null,
        reason: input.reason,
      },
    });
    this.name = "DeliveryInvalidDestinationError";
  }
}

export class DeliveryInvalidSourceQuantityError extends AppError {
  constructor(input: {
    quantity: number;
    sourceReference: string;
    sourceType: string;
    skuId: string;
  }) {
    super({
      code: "validation_error",
      statusCode: 400,
      title: "Invalid delivery source quantity",
      detail: `${input.sourceType} ${input.sourceReference} has an invalid quantity for SKU ${input.skuId}. Delivery source quantities must be positive integers.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.invalidSourceQuantity,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        skuId: input.skuId,
        quantity: input.quantity,
      },
    });
    this.name = "DeliveryInvalidSourceQuantityError";
  }
}

export class DeliveryPartialFulfillmentUnsupportedError extends AppError {
  constructor(input: { sourceType: string; sourceReference: string }) {
    super({
      code: "validation_error",
      statusCode: 400,
      title: "Partial fulfillment not supported",
      detail: `${input.sourceType} ${input.sourceReference} requires the full quantity to be delivered; partial fulfillment is not supported in this epic.`,
      details: {
        deliveryErrorCode: DELIVERY_ERROR_CODES.partialUnsupported,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      },
    });
    this.name = "DeliveryPartialFulfillmentUnsupportedError";
  }
}
