"use client";

export function formatSupplierDisplayName(name: string, slug: string) {
  const suffix = `(${slug})`;
  const normalizedName = name.trim();

  if (
    normalizedName.toLowerCase().endsWith(suffix.toLowerCase()) &&
    normalizedName.length > suffix.length
  ) {
    return normalizedName.slice(0, -suffix.length).trimEnd();
  }

  return normalizedName;
}
