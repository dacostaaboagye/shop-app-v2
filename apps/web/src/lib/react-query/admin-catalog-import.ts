import type {
  CatalogImportJobResponse,
  CatalogImportReportResponse,
  CatalogImportTemplateResponse,
  CatalogImportUploadRequest,
  CatalogImportUploadResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

export const adminCatalogImportJobQueryKey = (reference: string) =>
  ["admin", "catalog", "imports", reference] as const;

export async function fetchCatalogImportTemplate(): Promise<CatalogImportTemplateResponse> {
  return fetchJson<CatalogImportTemplateResponse>(
    "/api/admin/catalog/imports/template",
    undefined,
    { auth: "required" },
  );
}

export async function startCatalogImport(
  input: CatalogImportUploadRequest,
): Promise<CatalogImportUploadResponse> {
  return fetchJson<CatalogImportUploadResponse>(
    "/api/admin/catalog/imports",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    { auth: "required" },
  );
}

export async function fetchCatalogImportJob(
  reference: string,
): Promise<CatalogImportJobResponse> {
  return fetchJson<CatalogImportJobResponse>(
    `/api/admin/catalog/imports/${encodeURIComponent(reference)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchCatalogImportReport(
  reference: string,
): Promise<CatalogImportReportResponse> {
  return fetchJson<CatalogImportReportResponse>(
    `/api/admin/catalog/imports/${encodeURIComponent(reference)}/report`,
    undefined,
    { auth: "required" },
  );
}
