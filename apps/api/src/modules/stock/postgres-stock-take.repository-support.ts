import type {
  StockTakeCreateRequest,
  StockTakeLine,
  StockTakeSessionDetail,
  StockTakeSessionSummary,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  productVariants,
  stockBalances,
} from "@shop/database";
import { and, asc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type StockTakeLocation = { id: string; name: string; slug: string };

export function buildStockTakeSessionDetail(input: {
  appliedAt: Date | null;
  appliedByUserSlug: string | null;
  generatedAt: Date;
  generatedByUserSlug: string | null;
  lines: StockTakeLine[];
  location: StockTakeLocation;
  mode: StockTakeSessionSummary["mode"];
  portal: "admin" | "manager";
  reference: string;
  status: StockTakeSessionSummary["status"];
}): StockTakeSessionDetail {
  const blankSheet = input.lines.every(
    (line) => line.rowStatus === "manual_blank",
  );
  const lines =
    input.mode === "blind" ? input.lines.map(maskBlindLine) : input.lines;
  const summary = {
    appliedAt: input.appliedAt?.toISOString() ?? null,
    appliedByUserSlug: input.appliedByUserSlug,
    blankSheet,
    bookletPdfUrl: `/api/${input.portal}/stock-takes/${input.reference}/booklet.pdf`,
    generatedAt: input.generatedAt.toISOString(),
    generatedByUserSlug: input.generatedByUserSlug,
    lineCount: input.lines.length,
    locationName: input.location.name,
    locationSlug: input.location.slug,
    mode: input.mode,
    printableBookletUrl: `/${input.portal}/stock/takes/${input.reference}/booklet`,
    sheetCsvUrl: `/api/${input.portal}/stock-takes/${input.reference}/sheet.csv`,
    sheetXlsxUrl: `/api/${input.portal}/stock-takes/${input.reference}/sheet.xlsx`,
    status: input.status,
    stockTakeReference: input.reference,
    varianceReportPdfUrl:
      input.status === "applied"
        ? `/api/${input.portal}/stock-takes/${input.reference}/variance-report.pdf`
        : null,
  };

  return { ...summary, lines };
}

export function mapStockTakeLineInsertToDto(input: {
  expectedAvailableSnapshot: number;
  expectedOnHandSnapshot: number;
  expectedReservedSnapshot: number;
  lineNumber: number;
  productNameSnapshot: string;
  productSlugSnapshot: string | null;
  rowStatus: StockTakeLine["rowStatus"];
  skuSnapshot: string;
  unitOfMeasureSnapshot: string;
  variantNameSnapshot: string;
  variantSlugSnapshot: string | null;
}): StockTakeLine {
  return {
    appliedDelta: null,
    availableQuantity: input.expectedAvailableSnapshot,
    countedQuantity: null,
    lineNumber: input.lineNumber,
    note: null,
    productName: input.productNameSnapshot,
    productSlug: input.productSlugSnapshot,
    reservedQuantity: input.expectedReservedSnapshot,
    rowStatus: input.rowStatus,
    sku: input.skuSnapshot,
    systemOnHand: input.expectedOnHandSnapshot,
    unitOfMeasure: input.unitOfMeasureSnapshot,
    variance: null,
    variantName: input.variantNameSnapshot,
    variantSlug: input.variantSlugSnapshot,
  };
}

function maskBlindLine(line: StockTakeLine): StockTakeLine {
  return {
    ...line,
    availableQuantity: null,
    reservedQuantity: null,
    systemOnHand: null,
    variance: null,
  };
}

export async function selectActiveStockTakeVariantRows(
  tx: ApiDatabase,
  input: StockTakeCreateRequest & { locationId: string },
) {
  const pattern = `%${input.q ?? ""}%`;
  const hasQuery = Boolean(input.q);
  const filter = and(
    eq(catalogProducts.status, "active"),
    eq(productVariants.status, "active"),
    hasQuery
      ? or(
          ilike(catalogProducts.name, pattern),
          ilike(productVariants.name, pattern),
          ilike(productVariants.sku, pattern),
        )
      : undefined,
    input.brandSlug ? eq(catalogBrands.slug, input.brandSlug) : undefined,
    input.categorySlug
      ? eq(catalogCategories.slug, input.categorySlug)
      : undefined,
  );
  const balanceJoin = and(
    eq(stockBalances.skuId, productVariants.id),
    eq(stockBalances.locationId, input.locationId),
  );

  return tx
    .select({
      availableQuantity: sql<number>`cast(coalesce(${stockBalances.onHandQuantity}, 0) - coalesce(${stockBalances.reservedQuantity}, 0) as int)`,
      barcode: productVariants.barcode,
      onHandQuantity: sql<number>`cast(coalesce(${stockBalances.onHandQuantity}, 0) as int)`,
      productName: catalogProducts.name,
      productSlug: catalogProducts.slug,
      reservedQuantity: sql<number>`cast(coalesce(${stockBalances.reservedQuantity}, 0) as int)`,
      sku: productVariants.sku,
      skuId: productVariants.id,
      unitOfMeasure: productVariants.unitOfMeasure,
      variantName: productVariants.name,
      variantSlug: productVariants.slug,
    })
    .from(productVariants)
    .innerJoin(
      catalogProducts,
      eq(catalogProducts.id, productVariants.productId),
    )
    .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
    .leftJoin(
      catalogCategories,
      eq(catalogCategories.id, catalogProducts.categoryId),
    )
    .leftJoin(stockBalances, balanceJoin)
    .where(filter as SQL)
    .orderBy(asc(catalogProducts.name), asc(productVariants.name));
}
