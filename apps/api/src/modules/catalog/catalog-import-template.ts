import {
  type CatalogImportTemplateResponse,
  catalogImportOptionalColumns,
  catalogImportRequiredColumns,
} from "@shop/contracts";

const descriptions: Record<string, string> = {
  attributesJson: "JSON object of variant attributes, for example color/size.",
  barcode: "Optional unique barcode.",
  brandSlug: "Existing brand slug. Leave blank when not assigned.",
  categorySlug: "Existing category slug. Leave blank when not assigned.",
  costPrice: "Non-negative cost price using 0.00 format.",
  countryOfOrigin: "Optional ISO two-letter country code.",
  customsCode: "Optional customs/HS code.",
  description: "Optional product description.",
  isTaxable: "Optional true/false override for this variant.",
  manufacturerPartNumber: "Optional manufacturer part number.",
  packagingType: "Optional packaging label such as box or bottle.",
  priceIncludesTax: "Optional true/false product tax setting.",
  productName: "Product display name. Repeated names group variants.",
  sellingPrice: "Non-negative selling price using 0.00 format.",
  sku: "Unique stock-bearing SKU.",
  status: "active or archived. Defaults to active.",
  taxCategory: "Optional tax category.",
  unitOfMeasure: "Unit label such as each, kg, or pack.",
  variantName: "Variant display name.",
  weightGrams: "Optional positive whole-number weight.",
};

const examples: Record<string, string> = {
  attributesJson: '{"color":"black","size":"42"}',
  barcode: "1234567890123",
  brandSlug: "acme",
  categorySlug: "footwear",
  costPrice: "10.00",
  countryOfOrigin: "GH",
  customsCode: "6404",
  description: "Lightweight road shoe.",
  isTaxable: "true",
  manufacturerPartNumber: "ACME-SHOE-42",
  packagingType: "box",
  priceIncludesTax: "false",
  productName: "Training Shoe",
  sellingPrice: "15.00",
  sku: "SHOE-BLK-42",
  status: "active",
  taxCategory: "standard",
  unitOfMeasure: "each",
  variantName: "Black / 42",
  weightGrams: "500",
};

export function buildCatalogImportTemplate(): CatalogImportTemplateResponse {
  const columns = [
    ...catalogImportRequiredColumns,
    ...catalogImportOptionalColumns,
  ];
  const exampleRows = [
    Object.fromEntries(columns.map((key) => [key, examples[key] ?? ""])),
  ];

  return {
    columns: columns.map((name) => ({
      description: descriptions[name] ?? name,
      example: examples[name] ?? "",
      name,
      required: catalogImportRequiredColumns.includes(
        name as (typeof catalogImportRequiredColumns)[number],
      ),
    })),
    csv: buildCsv(columns, exampleRows[0] ?? {}),
    exampleRows,
    format: "csv",
    optionalColumns: [...catalogImportOptionalColumns],
    requiredColumns: [...catalogImportRequiredColumns],
  };
}

export function buildCatalogImportTemplateCsv(): string {
  const template = buildCatalogImportTemplate();
  const columns = template.columns.map((column) => column.name);
  const row = template.exampleRows[0] ?? {};
  return buildCsv(columns, row);
}

function buildCsv(columns: string[], row: Record<string, string>): string {
  return [
    columns.join(","),
    columns.map((column) => csv(row[column] ?? "")).join(","),
  ].join("\n");
}

function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
