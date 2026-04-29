import type { CurrentAssignment } from "@shop/contracts";

export const DEFAULT_ASSIGNMENTS: CurrentAssignment[] = [
  createAssignment({
    brandName: "Acme",
    brandSlug: "acme",
    categoryName: "Phones",
    categorySlug: "phones",
    productName: "Acme Phone",
    sku: "ACME-PHONE-BLK",
    skuId: "11111111-1111-4111-8111-111111111111",
    variantName: "Black",
  }),
  createAssignment({
    brandName: "Bravo",
    brandSlug: "bravo",
    categoryName: "Accessories",
    categorySlug: "accessories",
    productName: "Bravo Charger",
    sku: "BRAVO-CHARGE-20W",
    skuId: "22222222-2222-4222-8222-222222222222",
    variantName: "20W",
  }),
  createAssignment({
    brandName: "Acme",
    brandSlug: "acme",
    categoryName: "Accessories",
    categorySlug: "accessories",
    productName: "Acme Cable",
    sku: "ACME-CABLE-USBC",
    skuId: "33333333-3333-4333-8333-333333333333",
    variantName: "USB-C",
  }),
];

export function createAssignment(
  input: Pick<
    CurrentAssignment,
    | "brandName"
    | "brandSlug"
    | "categoryName"
    | "categorySlug"
    | "productName"
    | "sku"
    | "skuId"
    | "variantName"
  > & {
    availableQuantity?: number;
    sellingPrice?: string;
  },
): CurrentAssignment {
  return {
    availableQuantity: input.availableQuantity ?? 5,
    brandName: input.brandName,
    brandSlug: input.brandSlug,
    categoryName: input.categoryName,
    categorySlug: input.categorySlug,
    effectiveFrom: "2026-04-21T10:00:00.000Z",
    locationId: "44444444-4444-4444-8444-444444444444",
    onHandQuantity: 5,
    primaryImageUrl: "/uploads/product.png",
    productName: input.productName,
    productSlug: input.productName.toLowerCase().replaceAll(" ", "-"),
    quantity: 5,
    sellingPrice: input.sellingPrice ?? "120.00",
    sku: input.sku,
    skuId: input.skuId,
    variantName: input.variantName,
    variantSlug: input.variantName.toLowerCase().replaceAll(" ", "-"),
    workerId: "55555555-5555-4555-8555-555555555555",
  };
}
