import type {
  CatalogReferenceImportEntity,
  CatalogReferenceImportResponse,
  CatalogReferenceImportTemplateResponse,
  CatalogReferenceImportUploadRequest,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminCatalogReferenceImportListQueryKey = (
  entity: CatalogReferenceImportEntity,
) =>
  ["admin", "catalog", entity === "brand" ? "brands" : "categories"] as const;

export async function fetchCatalogReferenceImportTemplate(
  entity: CatalogReferenceImportEntity,
): Promise<CatalogReferenceImportTemplateResponse> {
  return fetchJson<CatalogReferenceImportTemplateResponse>(
    `${getReferenceImportBasePath(entity)}/template`,
    undefined,
    { auth: "required" },
  );
}

export async function startCatalogReferenceImport(
  entity: CatalogReferenceImportEntity,
  input: CatalogReferenceImportUploadRequest,
): Promise<CatalogReferenceImportResponse> {
  return fetchJson<CatalogReferenceImportResponse>(
    getReferenceImportBasePath(entity),
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

function getReferenceImportBasePath(
  entity: CatalogReferenceImportEntity,
): string {
  return entity === "brand"
    ? "/api/admin/catalog/brands/imports"
    : "/api/admin/catalog/categories/imports";
}
