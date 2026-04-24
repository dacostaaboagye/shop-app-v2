import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";

export type SalesRoutePermissionService = Pick<
  PermissionResolutionService,
  "assertHasPermission"
>;

type SalesInvoiceScope = {
  attributedWorkerId: string | null;
  createdBy: string | null;
  locationId: string;
};

export async function assertCanManageSales(input: {
  locationId: string;
  permissionService: SalesRoutePermissionService;
  userId: string;
}): Promise<void> {
  await input.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: "pos.sales.manage",
    user: { userId: input.userId },
  });
}

export async function assertCanProcessSales(input: {
  locationId: string;
  permissionService: SalesRoutePermissionService;
  userId: string;
}): Promise<void> {
  await input.permissionService.assertHasPermission({
    locationId: input.locationId,
    permission: "pos.sales.process",
    user: { userId: input.userId },
  });
}

export async function assertCanViewOwnSale(input: {
  invoice: SalesInvoiceScope;
  permissionService: SalesRoutePermissionService;
  userId: string;
}): Promise<void> {
  if (!isActorSalesOwner(input)) throw forbiddenSalesDocumentError();
  await assertHasAnySalesPermission(input, [
    "pos.sales.view",
    "pos.sales.manage",
  ]);
}

export async function assertCanReturnSale(input: {
  invoice: SalesInvoiceScope;
  permissionService: SalesRoutePermissionService;
  userId: string;
}): Promise<void> {
  if (await hasManagePermission(input)) return;
  if (!isActorSalesOwner(input)) throw forbiddenSalesDocumentError();
  await assertCanProcessSales({
    locationId: input.invoice.locationId,
    permissionService: input.permissionService,
    userId: input.userId,
  });
}

function isActorSalesOwner(input: {
  invoice: SalesInvoiceScope;
  userId: string;
}): boolean {
  return (
    input.invoice.attributedWorkerId === input.userId ||
    input.invoice.createdBy === input.userId
  );
}

async function hasManagePermission(input: {
  invoice: SalesInvoiceScope;
  permissionService: SalesRoutePermissionService;
  userId: string;
}): Promise<boolean> {
  try {
    await assertCanManageSales({
      locationId: input.invoice.locationId,
      permissionService: input.permissionService,
      userId: input.userId,
    });
    return true;
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 403) return false;
    throw error;
  }
}

async function assertHasAnySalesPermission(
  input: {
    invoice: SalesInvoiceScope;
    permissionService: SalesRoutePermissionService;
    userId: string;
  },
  permissions: readonly string[],
): Promise<void> {
  let forbidden: AppError | null = null;

  for (const permission of permissions) {
    try {
      await input.permissionService.assertHasPermission({
        locationId: input.invoice.locationId,
        permission,
        user: { userId: input.userId },
      });
      return;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 403) {
        forbidden = error;
        continue;
      }
      throw error;
    }
  }

  throw forbidden ?? forbiddenSalesDocumentError();
}

export function missingLocationIdError(): AppError {
  return new AppError({
    code: "validation_error",
    detail: "locationId is required.",
    statusCode: 400,
    title: "Missing locationId",
  });
}

export function invoiceNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Invoice ${reference} does not exist.`,
    statusCode: 404,
    title: "Invoice not found",
  });
}

export function unavailableSalesError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Sales services are not configured for this environment.",
    statusCode: 503,
    title: "Sales unavailable",
  });
}

function forbiddenSalesDocumentError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access this sales document.",
    statusCode: 403,
    title: "Forbidden",
  });
}
