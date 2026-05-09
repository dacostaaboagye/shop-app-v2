import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
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
