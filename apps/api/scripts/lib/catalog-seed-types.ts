export type SeedCategory = {
  description: string;
  name: string;
  parentSlug: string | null;
  slug: string;
};

export type SeedBrand = {
  description: string;
  name: string;
  slug: string;
  website: string;
};

export type SeedOption = {
  name: string;
  values: string[];
};

export type SeedVariant = {
  attributes: Record<string, string>;
  barcode: string;
  costPrice: string;
  customsCode: string;
  dimensionsCm: {
    height: number;
    length: number;
    width: number;
  };
  isDefault: boolean;
  manufacturerPartNumber: string;
  name: string;
  packagingType: string;
  sellingPrice: string;
  sku: string;
  slug: string;
  unitOfMeasure: string;
  weightGrams: number;
};

export type SeedProduct = {
  brandSlug: string;
  categorySlug: string;
  countryOfOrigin: string;
  description: string;
  features: string[];
  isTaxable: boolean;
  name: string;
  options: SeedOption[];
  priceIncludesTax: boolean;
  slug: string;
  taxCategory: string;
  variants: SeedVariant[];
};

