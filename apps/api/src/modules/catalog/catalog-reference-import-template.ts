import type {
  CatalogReferenceImportEntity,
  CatalogReferenceImportTemplateResponse,
} from "@shop/contracts";

type TemplateColumn = CatalogReferenceImportTemplateResponse["columns"][number];

const templates: Record<
  CatalogReferenceImportEntity,
  { columns: TemplateColumn[]; row: Record<string, string> }
> = {
  brand: {
    columns: [
      column("name", true, "Brand display name.", "Atlas Imports"),
      column(
        "description",
        false,
        "Optional brand description.",
        "Regional supplier label.",
      ),
      column(
        "website",
        false,
        "Optional brand website.",
        "https://example.com",
      ),
      column(
        "status",
        false,
        "active or archived. Defaults to active.",
        "active",
      ),
    ],
    row: {
      description: "Regional supplier label.",
      name: "Atlas Imports",
      status: "active",
      website: "https://example.com",
    },
  },
  category: {
    columns: [
      column("name", true, "Category display name.", "Footwear"),
      column(
        "description",
        false,
        "Optional category description.",
        "Shoes and related products.",
      ),
      column(
        "parentCategorySlug",
        false,
        "Existing parent category slug, if any.",
        "",
      ),
      column(
        "status",
        false,
        "active or archived. Defaults to active.",
        "active",
      ),
    ],
    row: {
      description: "Shoes and related products.",
      name: "Footwear",
      parentCategorySlug: "",
      status: "active",
    },
  },
};

export function buildReferenceImportTemplate(
  entity: CatalogReferenceImportEntity,
): CatalogReferenceImportTemplateResponse {
  const template = templates[entity];
  const names = template.columns.map((item) => item.name);
  return {
    columns: template.columns,
    csv: [
      names.join(","),
      names.map((name) => csv(template.row[name] ?? "")).join(","),
    ].join("\n"),
    entity,
    format: "csv",
  };
}

function column(
  name: string,
  required: boolean,
  description: string,
  example: string,
): TemplateColumn {
  return { description, example, name, required };
}

function csv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
