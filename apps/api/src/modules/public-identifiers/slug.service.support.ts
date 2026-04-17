import { AppError } from "../_core/errors/app-error.js";

export function buildCandidateSlug(baseSlug: string, attempt: number): string {
  if (attempt === 0) {
    return truncateSlug(baseSlug, 120);
  }

  const suffix = `-${attempt + 1}`;
  return `${truncateSlug(baseSlug, 120 - suffix.length)}${suffix}`;
}

export function normalizeSlug(value: string): string {
  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!normalizedValue) {
    return "item";
  }

  return truncateSlug(normalizedValue, 120);
}

export function truncateSlug(value: string, maxLength: number): string {
  const truncatedValue = value.slice(0, maxLength).replace(/-+$/g, "");

  return truncatedValue || "item";
}

export function slugAllocationError(): AppError {
  return new AppError({
    code: "conflict",
    detail: "Unable to allocate a unique slug. Try again.",
    statusCode: 409,
    title: "Slug allocation failed",
  });
}

export function slugRedirectCycleError(): AppError {
  return new AppError({
    code: "internal_error",
    detail: "Slug redirect history is invalid.",
    statusCode: 500,
    title: "Slug redirect error",
  });
}
