import {
  managerCustomerLookupQuerySchema,
  managerCustomerLookupResponseSchema,
  manualInvoiceRequestListQuerySchema,
  manualInvoiceRequestListResponseSchema,
  manualInvoiceRequestResponseSchema,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import { toManualInvoiceRequestResponse } from "./manual-invoice-request.mapper.js";
import type { ManualInvoiceRequestRouteDependencies } from "./manual-invoice-request.routes.js";
import { unavailableSalesError } from "./sales-route-access.js";

export function createUnavailableDependencies(): ManualInvoiceRequestRouteDependencies {
  return {
    manualInvoiceRequestRepository: {
      async findByReference() {
        throw unavailableSalesError();
      },
      async listByLocations() {
        throw unavailableSalesError();
      },
    },
    manualInvoiceRequestService: {
      async approveRequest() {
        throw unavailableSalesError();
      },
      async createRequest() {
        throw unavailableSalesError();
      },
      async getRequestOrThrow() {
        throw unavailableSalesError();
      },
      async rejectRequest() {
        throw unavailableSalesError();
      },
    },
    customerLookupRepository: {
      async searchCustomers() {
        throw unavailableSalesError();
      },
    },
    permissionService: {
      async assertHasPermission() {
        throw unavailableSalesError();
      },
      async resolveAllPermissions() {
        throw unavailableSalesError();
      },
    },
  };
}

export async function listManagerCustomerLookup(input: {
  dependencies: ManualInvoiceRequestRouteDependencies;
  query: unknown;
  userId: string;
}) {
  const query = managerCustomerLookupQuerySchema.parse(input.query);
  await resolvePermittedLocationIds({
    dependencies: input.dependencies,
    permission: "invoices.manual.request",
    userId: input.userId,
  });

  const items =
    await input.dependencies.customerLookupRepository?.searchCustomers({
      limit: query.limit,
      q: query.q,
    });

  return managerCustomerLookupResponseSchema.parse({ items: items ?? [] });
}

export async function listManualInvoiceRequests(input: {
  dependencies: ManualInvoiceRequestRouteDependencies;
  permission: string;
  query: unknown;
  userId: string;
}) {
  const query = manualInvoiceRequestListQuerySchema.parse(input.query);
  const locationIds = await resolvePermittedLocationIds({
    dependencies: input.dependencies,
    permission: input.permission,
    ...(query.locationId ? { requestedLocationId: query.locationId } : {}),
    userId: input.userId,
  });
  const result =
    await input.dependencies.manualInvoiceRequestRepository.listByLocations({
      locationIds,
      page: query.page,
      pageSize: query.pageSize,
      ...(query.q ? { q: query.q } : {}),
      ...(query.status !== "all" ? { status: query.status } : {}),
    });

  return manualInvoiceRequestListResponseSchema.parse({
    items: result.items.map((item) =>
      toManualInvoiceRequestResponse({ ...item, lines: [] }),
    ),
    page: query.page,
    pageSize: query.pageSize,
    total: result.total,
  });
}

export async function getManualInvoiceRequest(input: {
  dependencies: ManualInvoiceRequestRouteDependencies;
  params: unknown;
  permission: string;
  userId: string;
}) {
  const { reference } = input.params as { reference: string };
  const request =
    await input.dependencies.manualInvoiceRequestRepository.findByReference(
      reference,
    );
  if (!request) throw manualInvoiceRequestNotFoundError(reference);
  await assertHasLocationPermission({
    dependencies: input.dependencies,
    locationId: request.locationId,
    permission: input.permission,
    userId: input.userId,
  });

  return manualInvoiceRequestResponseSchema.parse(
    toManualInvoiceRequestResponse(request),
  );
}

export async function resolvePermittedLocationIds(input: {
  dependencies: ManualInvoiceRequestRouteDependencies;
  permission: string;
  requestedLocationId?: string;
  userId: string;
}) {
  const resolution =
    await input.dependencies.permissionService.resolveAllPermissions({
      userId: input.userId,
    });
  const locationIds = resolution.locationScopes
    .filter((scope) =>
      scope.permissions.some(
        (permission) => permission.key === input.permission,
      ),
    )
    .map((scope) => scope.locationId);

  if (!input.requestedLocationId) {
    if (locationIds.length === 0) throw forbiddenManualInvoiceRequestError();
    return locationIds;
  }

  if (!locationIds.includes(input.requestedLocationId)) {
    throw forbiddenManualInvoiceRequestError();
  }

  return [input.requestedLocationId];
}

export async function assertHasLocationPermission(input: {
  dependencies: ManualInvoiceRequestRouteDependencies;
  locationId: string;
  permission: string;
  userId: string;
}) {
  await input.dependencies.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: input.permission,
    user: { userId: input.userId },
  });
}

function manualInvoiceRequestNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Manual invoice request ${reference} does not exist.`,
    statusCode: 404,
    title: "Manual invoice request not found",
  });
}

function forbiddenManualInvoiceRequestError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access manual invoice requests.",
    statusCode: 403,
    title: "Forbidden",
  });
}
