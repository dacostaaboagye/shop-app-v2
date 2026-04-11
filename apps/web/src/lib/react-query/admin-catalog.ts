import type {
  AdminBrandListQuery,
  AdminBrandListResponse,
  AdminBrandSummary,
  AdminCategoryListQuery,
  AdminCategoryListResponse,
  AdminCategorySummary,
  AdminCreateBrandRequest,
  AdminCreateBrandResponse,
  AdminCreateCategoryRequest,
  AdminCreateCategoryResponse,
  AdminUpdateBrandRequest,
  AdminUpdateBrandResponse,
  AdminUpdateCategoryRequest,
  AdminUpdateCategoryResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

// ── Brands ──────────────────────────────────────────────────────────────────

export const adminBrandsQueryKey = (query: AdminBrandListQuery) =>
  ["admin", "catalog", "brands", query] as const;

export const adminBrandQueryKey = (slug: string) =>
  ["admin", "catalog", "brands", slug] as const;

export async function fetchAdminBrands(
  query: AdminBrandListQuery,
): Promise<AdminBrandListResponse> {
  return fetchJson<AdminBrandListResponse>(
    `/api/admin/catalog/brands?${buildSearchParams(query)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminBrand(
  slug: string,
): Promise<AdminBrandSummary> {
  return fetchJson<AdminBrandSummary>(
    `/api/admin/catalog/brands/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminBrand(
  input: AdminCreateBrandRequest,
): Promise<AdminCreateBrandResponse> {
  return fetchJson<AdminCreateBrandResponse>(
    "/api/admin/catalog/brands",
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminBrand(
  slug: string,
  input: AdminUpdateBrandRequest,
): Promise<AdminUpdateBrandResponse> {
  return fetchJson<AdminUpdateBrandResponse>(
    `/api/admin/catalog/brands/${encodeURIComponent(slug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

// ── Categories ──────────────────────────────────────────────────────────────

export const adminCategoriesQueryKey = (query: AdminCategoryListQuery) =>
  ["admin", "catalog", "categories", query] as const;

export const adminCategoryQueryKey = (slug: string) =>
  ["admin", "catalog", "categories", slug] as const;

export async function fetchAdminCategories(
  query: AdminCategoryListQuery,
): Promise<AdminCategoryListResponse> {
  return fetchJson<AdminCategoryListResponse>(
    `/api/admin/catalog/categories?${buildSearchParams(query)}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminCategory(
  slug: string,
): Promise<AdminCategorySummary> {
  return fetchJson<AdminCategorySummary>(
    `/api/admin/catalog/categories/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminCategory(
  input: AdminCreateCategoryRequest,
): Promise<AdminCreateCategoryResponse> {
  return fetchJson<AdminCreateCategoryResponse>(
    "/api/admin/catalog/categories",
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminCategory(
  slug: string,
  input: AdminUpdateCategoryRequest,
): Promise<AdminUpdateCategoryResponse> {
  return fetchJson<AdminUpdateCategoryResponse>(
    `/api/admin/catalog/categories/${encodeURIComponent(slug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function buildSearchParams(query: Record<string, unknown>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }

  return params.toString();
}

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}
