import type {
  StockTakeApplyResponse,
  StockTakeCreateRequest,
  StockTakeImportDryRunResponse,
  StockTakeLineCountEntry,
  StockTakeSessionDetail,
} from "@shop/contracts";
import { AppError } from "../src/modules/_core/errors/app-error.js";
import { issueAccessToken } from "../src/modules/auth/access-token.js";
import { createServer } from "../src/server/create-server.js";

const NOW = new Date("2026-05-04T10:00:00.000Z");
export const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
export const ACTOR_SLUG = "store-manager";
const ALLOWED_LOCATION_ID = "22222222-2222-4222-8222-222222222222";
const BLOCKED_LOCATION_ID = "33333333-3333-4333-8333-333333333333";

export function createStockTakeServer(input: {
  blockedSessionReference?: string;
  detailMode?: "blind" | "assisted";
  detailStatus?: StockTakeSessionDetail["status"];
  onApply?: (input: ApplyRouteInput) => void;
  onCreate?: (input: {
    generatedBy?: string;
    generatedBySlug?: string;
    request: StockTakeCreateRequest;
    portal: "admin" | "manager";
  }) => void;
  onDryRun?: (input: { reference: string; request: unknown }) => void;
  onGetVarianceReport?: () => void;
  onGetSession?: () => void;
  onListSessions?: (input: {
    locationSlug?: string;
    portal: "admin" | "manager";
  }) => void;
  onCancel?: (input: { reference: string; userId?: string }) => void;
  onUpdateLineCounts?: (input: {
    entries: StockTakeLineCountEntry[];
    reference: string;
  }) => void;
  reportStatus?: "generated" | "applied";
}) {
  const permissionService = {
    async assertHasPermission(args: { locationId?: string }) {
      if (!args.locationId || args.locationId === ALLOWED_LOCATION_ID) return;

      throw new AppError({
        code: "forbidden",
        detail: "You do not have permission to use stock takes here.",
        statusCode: 403,
        title: "Forbidden",
      });
    },
  };

  return createServer({
    accessControl: {
      accessTokenAuthenticationService: {
        async authenticate() {
          return { userId: ACTOR_ID, userSlug: ACTOR_SLUG };
        },
      },
      permissionService,
    },
    stockTake: {
      permissionService,
      stockTakeLifecycleService: {
        async cancelSession(cancelInput) {
          input.onCancel?.({
            reference: cancelInput.reference,
            ...(cancelInput.cancelledBy
              ? { userId: cancelInput.cancelledBy }
              : {}),
          });
          return createSessionSummary("cancelled", cancelInput.portal);
        },
        async updateLineCounts({ entries, reference }) {
          input.onUpdateLineCounts?.({ entries, reference });
          return {
            errors: [],
            status: input.detailStatus ?? "generated",
            stockTakeReference: reference,
            updatedCount: entries.length,
          };
        },
      },
      stockTakeListService: {
        async listSessions(listInput) {
          input.onListSessions?.({
            ...(listInput.query.locationSlug
              ? { locationSlug: listInput.query.locationSlug }
              : {}),
            portal: listInput.portal,
          });
          return {
            items: [createSessionSummary("generated", listInput.portal)],
            page: 1,
            pageSize: 25,
            totalCount: 1,
          };
        },
      },
      stockTakeService: {
        async createSession(createInput) {
          input.onCreate?.(createInput);
          return createSessionDetail(createInput.request.mode, "generated");
        },
        async findLocationBySlug(locationSlug) {
          return locationSlug === "airport-store"
            ? blockedLocation()
            : allowedLocation();
        },
        async findSessionLocationByReference(reference) {
          return reference === input.blockedSessionReference
            ? blockedLocation()
            : allowedLocation();
        },
        async getSession() {
          input.onGetSession?.();
          return createSessionDetail(
            input.detailMode ?? "blind",
            input.detailStatus ?? "generated",
          );
        },
        async getAppliedVarianceReportSession() {
          input.onGetVarianceReport?.();
          const status = input.reportStatus ?? "applied";
          if (status !== "applied") {
            throw new AppError({
              code: "conflict",
              detail: "Apply this stock-take before downloading the report.",
              statusCode: 409,
              title: "Variance report unavailable",
            });
          }
          return createSessionDetail(input.detailMode ?? "blind", status);
        },
      },
    },
    stockTakeImport: {
      permissionService,
      stockTakeApplyService: {
        async apply(applyInput) {
          input.onApply?.({
            reference: applyInput.reference,
            ...(applyInput.appliedBy ? { userId: applyInput.appliedBy } : {}),
            ...(applyInput.appliedBySlug
              ? { userSlug: applyInput.appliedBySlug }
              : {}),
          });
          return createApplyResponse();
        },
      },
      stockTakeImportService: {
        async dryRun(dryRunInput) {
          input.onDryRun?.({
            reference: dryRunInput.reference,
            request: dryRunInput.request,
          });
          return createDryRunResponse();
        },
      },
      stockTakeService: {
        async findSessionLocationByReference(reference) {
          return reference === input.blockedSessionReference
            ? blockedLocation()
            : allowedLocation();
        },
      },
    },
  });
}

function createSessionSummary(
  status: StockTakeSessionDetail["status"],
  portal: "admin" | "manager",
) {
  const detail = createSessionDetail("blind", status);
  return {
    appliedAt: detail.appliedAt,
    appliedByUserSlug: detail.appliedByUserSlug,
    blankSheet: detail.blankSheet,
    bookletPdfUrl: `/api/${portal}/stock-takes/${detail.stockTakeReference}/booklet.pdf`,
    generatedAt: detail.generatedAt,
    generatedByUserSlug: detail.generatedByUserSlug,
    lineCount: detail.lineCount,
    locationName: detail.locationName,
    locationSlug: detail.locationSlug,
    mode: detail.mode,
    printableBookletUrl: `/${portal}/stock/takes/${detail.stockTakeReference}/booklet`,
    sheetCsvUrl: `/api/${portal}/stock-takes/${detail.stockTakeReference}/sheet.csv`,
    sheetXlsxUrl: `/api/${portal}/stock-takes/${detail.stockTakeReference}/sheet.xlsx`,
    status: detail.status,
    stockTakeReference: detail.stockTakeReference,
    varianceReportPdfUrl: detail.varianceReportPdfUrl,
  };
}

type ApplyRouteInput = {
  reference: string;
  userId?: string;
  userSlug?: string;
};

export function authHeaders() {
  const { token } = issueAccessToken({
    expiresInSeconds: 900,
    now: NOW,
    secret: "development-access-secret",
    userId: ACTOR_ID,
    userSlug: ACTOR_SLUG,
  });

  return { authorization: `Bearer ${token}` };
}

function allowedLocation() {
  return {
    id: ALLOWED_LOCATION_ID,
    name: "Downtown Store",
    slug: "downtown-store",
  };
}

function blockedLocation() {
  return {
    id: BLOCKED_LOCATION_ID,
    name: "Airport Store",
    slug: "airport-store",
  };
}

function createApplyResponse(): StockTakeApplyResponse {
  return {
    appliedAt: NOW.toISOString(),
    appliedByUserSlug: ACTOR_SLUG,
    lines: [
      {
        countedQuantity: 12,
        lineNumber: 1,
        movementCreated: true,
        previousOnHandQuantity: 10,
        productName: "Rice",
        quantityDelta: 2,
        sku: "RICE-5KG",
        status: "changed",
        variantName: "5kg",
      },
    ],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    status: "applied",
    stockTakeReference: "STKTAKE-2026-0001",
    summary: {
      appliedRows: 1,
      changedRows: 1,
      noChangeRows: 0,
      totalNegativeDelta: 0,
      totalPositiveDelta: 2,
    },
  };
}

function createSessionDetail(
  mode: "blind" | "assisted",
  status: StockTakeSessionDetail["status"],
): StockTakeSessionDetail {
  const shouldMask = mode === "blind";

  return {
    appliedAt: status === "applied" ? NOW.toISOString() : null,
    appliedByUserSlug: status === "applied" ? ACTOR_SLUG : null,
    blankSheet: false,
    bookletPdfUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/booklet.pdf",
    generatedAt: NOW.toISOString(),
    generatedByUserSlug: ACTOR_SLUG,
    lineCount: 1,
    lines: [
      {
        appliedDelta: status === "applied" ? 2 : null,
        availableQuantity: shouldMask ? null : 8,
        countedQuantity: status === "applied" ? 12 : null,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        productSlug: "rice",
        reservedQuantity: shouldMask ? null : 2,
        rowStatus: status === "applied" ? "counted" : "catalog_sku",
        sku: "RICE-5KG",
        systemOnHand: shouldMask ? null : 10,
        unitOfMeasure: "bag",
        variance: status === "applied" && !shouldMask ? 2 : null,
        variantName: "5kg",
        variantSlug: "rice-5kg",
      },
    ],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    mode,
    printableBookletUrl: "/admin/stock/takes/STKTAKE-2026-0001/booklet",
    sheetCsvUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.csv",
    sheetXlsxUrl: "/api/admin/stock-takes/STKTAKE-2026-0001/sheet.xlsx",
    status,
    stockTakeReference: "STKTAKE-2026-0001",
    varianceReportPdfUrl:
      status === "applied"
        ? "/api/admin/stock-takes/STKTAKE-2026-0001/variance-report.pdf"
        : null,
  };
}

function createDryRunResponse(): StockTakeImportDryRunResponse {
  return {
    canApply: true,
    errors: [],
    locationName: "Downtown Store",
    locationSlug: "downtown-store",
    rows: [
      {
        availableQuantity: 8,
        countedQuantity: 12,
        lineNumber: 1,
        note: null,
        productName: "Rice",
        reservedQuantity: 2,
        rowNumber: 2,
        sku: "RICE-5KG",
        status: "valid",
        systemOnHand: 10,
        variance: 2,
        variantName: "5kg",
      },
    ],
    status: "generated",
    stockTakeReference: "STKTAKE-2026-0001",
    summary: {
      duplicateRows: 0,
      invalidRows: 0,
      totalNegativeVariance: 0,
      totalPositiveVariance: 2,
      totalRows: 1,
      unknownRows: 0,
      validRows: 1,
      varianceRows: 1,
    },
  };
}
