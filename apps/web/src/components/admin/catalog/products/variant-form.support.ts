import type {
  AdminCreateVariantRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
  VariantDimensions,
} from "@shop/contracts";

export type VariantFormValues = {
  attributesText: string;
  barcode: string;
  costPrice: string;
  customsCode: string;
  dimensionsHeight: string;
  dimensionsLength: string;
  dimensionsWidth: string;
  isDefault: boolean;
  manufacturerPartNumber: string;
  name: string;
  packagingType: string;
  sellingPrice: string;
  sku: string;
  status: "active" | "archived";
  unitOfMeasure: string;
  weightGrams: string;
  isTaxable: "inherit" | "yes" | "no";
  taxCategory: string;
};

export function requiredString(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() ? undefined : message,
  };
}

export function moneyString(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      isMoneyString(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      isMoneyString(value) ? undefined : message,
  };
}

export function positiveIntegerOrBlank(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveInteger(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveInteger(value) ? undefined : message,
  };
}

export function positiveNumberOrBlank(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveNumber(value) ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      value.trim() === "" || isPositiveNumber(value) ? undefined : message,
  };
}

export function attributeLines(message: string) {
  return {
    onBlur: ({ value }: { value: string }) =>
      parseAttributesText(value).ok ? undefined : message,
    onSubmit: ({ value }: { value: string }) =>
      parseAttributesText(value).ok ? undefined : message,
  };
}

export function getVariantFormValues(
  variant: AdminVariantSummary,
): VariantFormValues {
  return {
    attributesText: formatAttributesText(variant.attributes),
    barcode: variant.barcode ?? "",
    costPrice: variant.costPrice,
    customsCode: variant.customsCode ?? "",
    dimensionsHeight: formatOptionalNumber(variant.dimensionsCm?.height),
    dimensionsLength: formatOptionalNumber(variant.dimensionsCm?.length),
    dimensionsWidth: formatOptionalNumber(variant.dimensionsCm?.width),
    isDefault: variant.isDefault,
    manufacturerPartNumber: variant.manufacturerPartNumber ?? "",
    name: variant.name,
    packagingType: variant.packagingType ?? "",
    sellingPrice: variant.sellingPrice,
    sku: variant.sku,
    status: variant.status,
    unitOfMeasure: variant.unitOfMeasure,
    weightGrams: formatOptionalNumber(variant.weightGrams),
    isTaxable:
      variant.isTaxable === true
        ? "yes"
        : variant.isTaxable === false
          ? "no"
          : "inherit",
    taxCategory: variant.taxCategory ?? "",
  };
}

export function getDefaultVariantFormValues(): VariantFormValues {
  return {
    attributesText: "",
    barcode: "",
    costPrice: "0.00",
    customsCode: "",
    dimensionsHeight: "",
    dimensionsLength: "",
    dimensionsWidth: "",
    isDefault: false,
    manufacturerPartNumber: "",
    name: "",
    packagingType: "",
    sellingPrice: "0.00",
    sku: "",
    status: "active",
    unitOfMeasure: "each",
    weightGrams: "",
    isTaxable: "inherit",
    taxCategory: "",
  };
}

export function toVariantCreateRequest(
  values: VariantFormValues,
  canSeeCostPrice: boolean,
): AdminCreateVariantRequest {
  return {
    attributes: toAttributesRecord(values.attributesText),
    barcode: toNullableText(values.barcode),
    costPrice: canSeeCostPrice ? values.costPrice.trim() : "0.00",
    customsCode: toNullableText(values.customsCode),
    dimensionsCm: toDimensions(values),
    isDefault: values.status === "archived" ? false : values.isDefault,
    manufacturerPartNumber: toNullableText(values.manufacturerPartNumber),
    name: values.name.trim(),
    packagingType: toNullableText(values.packagingType),
    sellingPrice: values.sellingPrice.trim(),
    sku: values.sku.trim(),
    status: values.status,
    unitOfMeasure: values.unitOfMeasure.trim(),
    weightGrams: toNullableInteger(values.weightGrams),
    isTaxable:
      values.isTaxable === "yes"
        ? true
        : values.isTaxable === "no"
          ? false
          : null,
    taxCategory: toNullableText(values.taxCategory),
  };
}

export function toVariantUpdateRequest(
  values: VariantFormValues,
  canSeeCostPrice: boolean,
): AdminUpdateVariantRequest {
  const payload: AdminUpdateVariantRequest = {
    attributes: toAttributesRecord(values.attributesText),
    barcode: toNullableText(values.barcode),
    customsCode: toNullableText(values.customsCode),
    dimensionsCm: toDimensions(values),
    isDefault: values.status === "archived" ? false : values.isDefault,
    manufacturerPartNumber: toNullableText(values.manufacturerPartNumber),
    name: values.name.trim(),
    packagingType: toNullableText(values.packagingType),
    sellingPrice: values.sellingPrice.trim(),
    sku: values.sku.trim(),
    status: values.status,
    unitOfMeasure: values.unitOfMeasure.trim(),
    weightGrams: toNullableInteger(values.weightGrams),
    isTaxable:
      values.isTaxable === "yes"
        ? true
        : values.isTaxable === "no"
          ? false
          : null,
    taxCategory: toNullableText(values.taxCategory),
  };

  if (canSeeCostPrice) {
    payload.costPrice = values.costPrice.trim();
  }

  return payload;
}

export function getVariantArchiveRequest(): AdminUpdateVariantRequest {
  return { status: "archived" };
}

function isMoneyString(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number(value.trim()) > 0;
}

function isPositiveNumber(value: string): boolean {
  return Number.isFinite(Number(value.trim())) && Number(value.trim()) > 0;
}

function parseAttributesText(
  value: string,
): { ok: true; value: Record<string, string> } | { ok: false } {
  const entries = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: Record<string, string> = {};

  for (const entry of entries) {
    const divider = entry.indexOf(":");
    if (divider <= 0) {
      return { ok: false };
    }

    const key = entry.slice(0, divider).trim();
    const itemValue = entry.slice(divider + 1).trim();
    if (!key || !itemValue) {
      return { ok: false };
    }

    parsed[key] = itemValue;
  }

  return { ok: true, value: parsed };
}

function toAttributesRecord(value: string): Record<string, string> {
  const parsed = parseAttributesText(value);

  return parsed.ok ? parsed.value : {};
}

function formatAttributesText(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function formatOptionalNumber(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number.parseInt(trimmed, 10);
}

function toNullableNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

function toDimensions(values: VariantFormValues): VariantDimensions | null {
  const height = toNullableNumber(values.dimensionsHeight);
  const length = toNullableNumber(values.dimensionsLength);
  const width = toNullableNumber(values.dimensionsWidth);

  if (height === undefined && length === undefined && width === undefined) {
    return null;
  }

  return {
    ...(height === undefined ? {} : { height }),
    ...(length === undefined ? {} : { length }),
    ...(width === undefined ? {} : { width }),
  };
}
