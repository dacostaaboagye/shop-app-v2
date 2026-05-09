import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
  AdminOpeningStockRequest,
  AdminStockCountRequest,
} from "@shop/contracts";
import type { StockTakeLine } from "@/lib/react-query/stock-takes";

export type CatalogIntakeDraftValues = {
  brandSlug: string;
  categorySlug: string;
  costPrice: string;
  countedQuantity: number;
  description: string;
  isTaxable: boolean;
  lineNumber: number;
  priceIncludesTax: boolean;
  productName: string;
  sellingPrice: string;
  sku: string;
  unitOfMeasure: string;
  variantName: string;
};

export type CatalogIntakeRequests = {
  product: AdminCreateProductRequest;
  variant: AdminCreateVariantRequest;
};

export type CatalogIntakeCreatedDraft = {
  lineNumber: number;
  productSlug: string;
  sku: string;
  variantSlug: string;
};

export function getManualStockTakeLines(lines: readonly StockTakeLine[]) {
  return lines.filter((line) => line.rowStatus === "manual_blank");
}

export function getDefaultCatalogIntakeDraft(
  line: StockTakeLine,
): CatalogIntakeDraftValues {
  return {
    brandSlug: "none",
    categorySlug: "none",
    costPrice: "0.00",
    countedQuantity: line.countedQuantity ?? 0,
    description: line.note ?? "",
    isTaxable: true,
    lineNumber: line.lineNumber,
    priceIncludesTax: false,
    productName: line.productName,
    sellingPrice: "0.00",
    sku: line.sku,
    unitOfMeasure: line.unitOfMeasure,
    variantName: line.variantName,
  };
}

export function getCatalogIntakeDraftValidation(
  value: CatalogIntakeDraftValues,
): string | null {
  if (!value.productName.trim()) return "Enter a product name.";
  if (!value.variantName.trim()) return "Enter a variant name.";
  if (!value.sku.trim()) return "Enter a SKU.";
  if (!value.unitOfMeasure.trim()) return "Enter a unit of measure.";
  if (!isMoneyValue(value.costPrice)) {
    return "Enter a valid cost price with up to 2 decimal places.";
  }
  if (!isMoneyValue(value.sellingPrice)) {
    return "Enter a valid selling price with up to 2 decimal places.";
  }

  return null;
}

export function toCatalogIntakeRequests(
  value: CatalogIntakeDraftValues,
): CatalogIntakeRequests {
  return {
    product: {
      brandSlug: toNullableSlug(value.brandSlug),
      categorySlug: toNullableSlug(value.categorySlug),
      description: toNullableText(value.description),
      isTaxable: value.isTaxable,
      name: value.productName.trim(),
      priceIncludesTax: value.priceIncludesTax,
      status: "archived",
    },
    variant: {
      attributes: {},
      costPrice: normalizeMoney(value.costPrice),
      isDefault: true,
      name: value.variantName.trim(),
      sellingPrice: normalizeMoney(value.sellingPrice),
      sku: value.sku.trim(),
      status: "archived",
      unitOfMeasure: value.unitOfMeasure.trim(),
    },
  };
}

export function getLineDisplayName(line: StockTakeLine) {
  const productName = line.productName.trim();
  const variantName = line.variantName.trim();

  if (productName && variantName) return `${productName} - ${variantName}`;
  if (productName) return productName;
  if (variantName) return variantName;

  return `Manual line ${line.lineNumber}`;
}

export function getCatalogStockIntakeSku(
  line: StockTakeLine,
  createdDraft: CatalogIntakeCreatedDraft | null,
) {
  return (createdDraft?.sku ?? line.sku).trim();
}

export function getCatalogStockIntakeDisabledReason({
  createdDraft,
  line,
}: {
  createdDraft: CatalogIntakeCreatedDraft | null;
  line: StockTakeLine;
}) {
  if (!getCatalogStockIntakeSku(line, createdDraft)) {
    return "Create or enter a SKU before recording stock.";
  }

  if (line.countedQuantity === null) {
    return "Enter a counted quantity before recording stock.";
  }

  return null;
}

export function buildCatalogOpeningStockRequest({
  createdDraft,
  line,
  locationSlug,
  reference,
}: {
  createdDraft: CatalogIntakeCreatedDraft | null;
  line: StockTakeLine;
  locationSlug: string;
  reference: string;
}): AdminOpeningStockRequest {
  return {
    lines: [
      {
        note: buildCatalogStockNote(line, reference),
        onHandQuantity: getCountedQuantity(line),
        sku: getRequiredSku(line, createdDraft),
      },
    ],
    locationSlug,
    note: buildCatalogStockNote(line, reference),
    sourceReference: truncateText(reference, 160),
    sourceType: "physical_count",
  };
}

export function buildCatalogFoundStockRequest({
  createdDraft,
  line,
  locationSlug,
  reference,
}: {
  createdDraft: CatalogIntakeCreatedDraft | null;
  line: StockTakeLine;
  locationSlug: string;
  reference: string;
}): AdminStockCountRequest {
  return {
    locationSlug,
    note: buildCatalogStockNote(line, reference),
    onHandQuantity: getCountedQuantity(line),
    reasonCode: "found_stock",
    sku: getRequiredSku(line, createdDraft),
  };
}

function isMoneyValue(value: string) {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function normalizeMoney(value: string) {
  return value.trim();
}

function toNullableSlug(value: string) {
  const normalized = value.trim();
  return normalized && normalized !== "none" ? normalized : null;
}

function toNullableText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getRequiredSku(
  line: StockTakeLine,
  createdDraft: CatalogIntakeCreatedDraft | null,
) {
  const sku = getCatalogStockIntakeSku(line, createdDraft);
  if (!sku) throw new Error("Create or enter a SKU before recording stock.");
  return sku;
}

function getCountedQuantity(line: StockTakeLine) {
  if (line.countedQuantity === null) {
    throw new Error("Enter a counted quantity before recording stock.");
  }
  return line.countedQuantity;
}

function buildCatalogStockNote(line: StockTakeLine, reference: string) {
  const note = line.note?.trim();
  const text = note
    ? `Stock-take ${reference}, line ${line.lineNumber}: ${note}`
    : `Stock-take ${reference}, line ${line.lineNumber}.`;
  return truncateText(text, 500);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.trim();
  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized;
}
