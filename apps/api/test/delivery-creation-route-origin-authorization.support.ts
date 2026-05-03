import type {
  DeliveryEligibleOnlineOrder,
  DeliveryEligiblePosSale,
  DeliveryEligibleTransfer,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { createServer } from "../src/server/create-server.js";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const ORIGIN_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
export const ORIGIN_LOCATION_SLUG = "main-store";
export const DESTINATION_LOCATION_ID = "33333333-3333-4333-8333-333333333333";
export const SKU_ID = "44444444-4444-4444-8444-444444444444";
export const AUTH_HEADERS = { authorization: "Bearer test-token" };

export function createDeliveryRouteServer(input: {
  allowRoutePermission?: boolean;
  events: string[];
  onlineOrderResponse?: ReturnType<typeof deliveryResponse>;
  onlineOrderSourcePort?: OnlineOrderDeliverySourcePort;
  posSaleSourcePort?: PosSaleDeliverySourcePort;
  transferSourcePort?: TransferDeliverySourcePort;
}) {
  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: USER_ID, userSlug: "foreign-manager" };
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `middleware:${args.permission}:${args.scope ?? "contextual"}`,
          );
          if (args.scope === "any_active") return;
          if (args.permission === "deliveries.create_from_online_order") return;
          throw permissionDenied();
        },
      },
    },
    deliveries: {
      deliveryCreationService: {
        async createFromOnlineOrder(args) {
          if (input.onlineOrderResponse) {
            input.events.push(`service:${args.orderReference}`);
            return {
              delivery: {
                ...input.onlineOrderResponse,
              },
              status: "created",
            };
          }
          throw serviceMustNotRun();
        },
        async createFromPosSale() {
          throw serviceMustNotRun();
        },
        async createFromTransfer() {
          throw serviceMustNotRun();
        },
      },
      deliveryPublicIdentifierResolver: {
        async findLocationIdBySlug() {
          throw unused();
        },
        async findUserIdBySlug() {
          throw unused();
        },
      },
      deliveryQueryService: {
        async findById() {
          throw unused();
        },
        async findByReference() {
          throw unused();
        },
        async hasSkuHistory() {
          throw unused();
        },
        async listByAgent() {
          throw unused();
        },
        async listByLocation() {
          throw unused();
        },
      },
      deliveryStatusService: {
        async assign() {
          throw unused();
        },
        async cancel() {
          throw unused();
        },
        async complete() {
          throw unused();
        },
        async dispatch() {
          throw unused();
        },
        async reassign() {
          throw unused();
        },
      },
      permissionService: {
        async assertHasPermission(args) {
          input.events.push(
            `route:${args.permission}:${args.scope ?? "contextual"}:${args.locationId ?? "none"}`,
          );
          if (input.allowRoutePermission) return;
          throw permissionDenied();
        },
      },
      onlineOrderSourcePort:
        input.onlineOrderSourcePort ??
        ({
          async findByOrderReference() {
            throw unused();
          },
        } satisfies OnlineOrderDeliverySourcePort),
      posSaleSourcePort:
        input.posSaleSourcePort ??
        ({
          async findByInvoiceReference() {
            throw unused();
          },
        } satisfies PosSaleDeliverySourcePort),
      transferSourcePort:
        input.transferSourcePort ??
        ({
          async findByTransferReference() {
            throw unused();
          },
        } satisfies TransferDeliverySourcePort),
    },
  });
}

export function onlineOrderSource(
  reference: string,
): DeliveryEligibleOnlineOrder {
  return {
    items: [{ quantity: 1, skuId: SKU_ID }],
    locationId: ORIGIN_LOCATION_ID,
    orderReference: reference,
    state: "confirmed",
  };
}

export function posSaleSource(reference: string): DeliveryEligiblePosSale {
  return {
    customer: {
      email: null,
      name: "Walk-in customer",
      phone: null,
    },
    invoiceReference: reference,
    items: [{ quantity: 1, skuId: SKU_ID }],
    locationId: ORIGIN_LOCATION_ID,
    state: "confirmed",
  };
}

export function deliveryResponse(sourceReference: string) {
  return {
    assignedAt: null,
    assignedBy: null,
    assignedUserId: null,
    assignedUserSlug: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    createdBy: USER_ID,
    createdBySlug: "creator-user",
    deliveryId: "66666666-6666-4666-8666-666666666666",
    deliveryReference: "DLV-00001",
    destination: { kind: "external" as const, snapshot: deliveryDestination() },
    dispatchedAt: null,
    dispatchedBy: null,
    items: [
      {
        deliveryItemId: "77777777-7777-4777-8777-777777777777",
        itemReference: "DLI-20260501-0001",
        quantity: 1,
        sku: "SKU-1",
        skuId: SKU_ID,
      },
    ],
    originLocationId: ORIGIN_LOCATION_ID,
    originLocationSlug: ORIGIN_LOCATION_SLUG,
    sourceReference,
    sourceType: "online_order" as const,
    status: "draft" as const,
  };
}

export function transferSource(reference: string): DeliveryEligibleTransfer {
  return {
    destinationLocationId: DESTINATION_LOCATION_ID,
    items: [{ quantity: 1, skuId: SKU_ID }],
    skuSnapshot: {
      productName: "Product",
      sku: "SKU-1",
      variantName: "Variant",
    },
    sourceLocationId: ORIGIN_LOCATION_ID,
    state: "approved",
    supplyRequestId: "55555555-5555-4555-8555-555555555555",
    transferReference: reference,
  };
}

export function deliveryDestination() {
  return {
    addressLines: ["12 Market Street"],
    city: "Accra",
    contactEmail: null,
    contactName: "Adwoa Mensah",
    contactPhone: "+233200000000",
    countryCode: "GH",
    notes: null,
    postalCode: null,
    region: null,
  };
}

function permissionDenied() {
  return new AppError({
    code: "forbidden",
    detail: "Location-scoped delivery creation permission denied.",
    statusCode: 403,
    title: "Forbidden",
  });
}

function serviceMustNotRun() {
  return new Error("DeliveryCreationService must not run after authz rejects.");
}

function unused() {
  return new Error("Not used by this test.");
}
