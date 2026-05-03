import type { Route } from "next";
import { toRoute } from "@/lib/routes";

export type CatalogHistoryPageProps = {
  backHref: Route;
  backLabel: string;
  description: string;
  title: string;
};

const TITLE = "Change history";

// Centralised so every entity surface reads the same heading + sub-line. The
// inline panel previously lived under the detail page; this gives the
// dedicated page a consistent operationally-trustworthy frame.
export function buildProductHistoryPageProps(
  product: { name: string; slug: string } | null,
  fallbackSlug: string,
): CatalogHistoryPageProps {
  if (!product) {
    return {
      backHref: toRoute(`/admin/products/${fallbackSlug}`),
      backLabel: "Back to product",
      description: "The product you're looking for could not be found.",
      title: TITLE,
    };
  }

  return {
    backHref: toRoute(`/admin/products/${product.slug}`),
    backLabel: "Back to product",
    description: `All edits, archives, and restores for ${product.name}.`,
    title: TITLE,
  };
}

export function buildBrandHistoryPageProps(
  brand: { name: string; slug: string } | null,
  fallbackSlug: string,
): CatalogHistoryPageProps {
  if (!brand) {
    return {
      backHref: toRoute(`/admin/products/brands/${fallbackSlug}`),
      backLabel: "Back to brand",
      description: "The brand you're looking for could not be found.",
      title: TITLE,
    };
  }

  return {
    backHref: toRoute(`/admin/products/brands/${brand.slug}`),
    backLabel: "Back to brand",
    description: `All edits, archives, and restores for ${brand.name}.`,
    title: TITLE,
  };
}

export function buildCategoryHistoryPageProps(
  category: { name: string; slug: string } | null,
  fallbackSlug: string,
): CatalogHistoryPageProps {
  if (!category) {
    return {
      backHref: toRoute(`/admin/products/categories/${fallbackSlug}`),
      backLabel: "Back to category",
      description: "The category you're looking for could not be found.",
      title: TITLE,
    };
  }

  return {
    backHref: toRoute(`/admin/products/categories/${category.slug}`),
    backLabel: "Back to category",
    description: `All edits, archives, and restores for ${category.name}.`,
    title: TITLE,
  };
}

export function buildVariantHistoryPageProps(
  product: { name: string; slug: string } | null,
  variant: { name: string; slug: string } | null,
  fallbackProductSlug: string,
): CatalogHistoryPageProps {
  if (!product || !variant) {
    return {
      backHref: toRoute(`/admin/products/${fallbackProductSlug}`),
      backLabel: "Back to product",
      description: "The variant you're looking for could not be found.",
      title: TITLE,
    };
  }

  return {
    backHref: toRoute(`/admin/products/${product.slug}`),
    backLabel: `Back to ${product.name}`,
    description: `All edits, archives, and restores for ${variant.name}.`,
    title: TITLE,
  };
}

export const NO_HISTORY_ACCESS_DESCRIPTION =
  "Ask an administrator to grant the catalog history permission if you need this view.";
