import type {
  AdminAddOptionValueRequest,
  AdminCreateProductOptionRequest,
  AdminCreateProductRequest,
  AdminCreateProductResponse,
  AdminCreateVariantRequest,
  AdminCreateVariantResponse,
  AdminProductDetail,
  AdminProductListQuery,
  AdminProductListResponse,
  AdminProductOption,
  AdminUpdateProductRequest,
  AdminUpdateProductResponse,
  AdminUpdateVariantRequest,
  AdminUpdateVariantResponse,
} from "@shop/contracts";
import { fetchJson } from "@/lib/react-query/fetch-json";

// ── Products ─────────────────────────────────────────────────────────────────

export const adminProductsQueryKey = (query: AdminProductListQuery) =>
  ["admin", "catalog", "products", query] as const;

export const adminProductQueryKey = (slug: string) =>
  ["admin", "catalog", "products", slug] as const;

export async function fetchAdminProducts(
  query: AdminProductListQuery,
): Promise<AdminProductListResponse> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value));
  }

  return fetchJson<AdminProductListResponse>(
    `/api/admin/catalog/products?${params.toString()}`,
    undefined,
    { auth: "required" },
  );
}

export async function fetchAdminProduct(
  slug: string,
): Promise<AdminProductDetail> {
  return fetchJson<AdminProductDetail>(
    `/api/admin/catalog/products/${encodeURIComponent(slug)}`,
    undefined,
    { auth: "required" },
  );
}

export async function createAdminProduct(
  input: AdminCreateProductRequest,
): Promise<AdminCreateProductResponse> {
  return fetchJson<AdminCreateProductResponse>(
    "/api/admin/catalog/products",
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminProduct(
  slug: string,
  input: AdminUpdateProductRequest,
): Promise<AdminUpdateProductResponse> {
  return fetchJson<AdminUpdateProductResponse>(
    `/api/admin/catalog/products/${encodeURIComponent(slug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

// ── Variants ─────────────────────────────────────────────────────────────────

export async function createAdminVariant(
  productSlug: string,
  input: AdminCreateVariantRequest,
): Promise<AdminCreateVariantResponse> {
  return fetchJson<AdminCreateVariantResponse>(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/variants`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function updateAdminVariant(
  productSlug: string,
  variantSlug: string,
  input: AdminUpdateVariantRequest,
): Promise<AdminUpdateVariantResponse> {
  return fetchJson<AdminUpdateVariantResponse>(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/variants/${encodeURIComponent(variantSlug)}`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "PATCH" },
    { auth: "required" },
  );
}

// ── Options ──────────────────────────────────────────────────────────────────

export async function createAdminProductOption(
  productSlug: string,
  input: AdminCreateProductOptionRequest,
): Promise<AdminProductOption> {
  return fetchJson<AdminProductOption>(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/options`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function deleteAdminProductOption(
  productSlug: string,
  optionId: string,
): Promise<void> {
  return fetchJson<void>(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/options/${optionId}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

export async function addAdminOptionValue(
  productSlug: string,
  optionId: string,
  input: AdminAddOptionValueRequest,
): Promise<{ valueId: string; position: number; value: string }> {
  return fetchJson(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/options/${optionId}/values`,
    { body: JSON.stringify(input), headers: jsonHeaders(), method: "POST" },
    { auth: "required" },
  );
}

export async function deleteAdminOptionValue(
  productSlug: string,
  optionId: string,
  valueId: string,
): Promise<void> {
  return fetchJson<void>(
    `/api/admin/catalog/products/${encodeURIComponent(productSlug)}/options/${optionId}/values/${valueId}`,
    { method: "DELETE" },
    { auth: "required" },
  );
}

// ── Shared ───────────────────────────────────────────────────────────────────

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}
