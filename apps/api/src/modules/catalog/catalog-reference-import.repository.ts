import { catalogBrands } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";

export type CategoryImportKey = {
  name: string;
  parentCategorySlug: string | null;
};

export type CatalogReferenceImportRepository = {
  findExistingBrandNames(names: string[]): Promise<Set<string>>;
  findExistingCategoryKeys(keys: CategoryImportKey[]): Promise<Set<string>>;
};

export class PostgresCatalogReferenceImportRepository
  implements CatalogReferenceImportRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async findExistingBrandNames(names: string[]): Promise<Set<string>> {
    if (names.length === 0) return new Set();
    const wanted = new Set(names.map(normalize));
    const rows = await this.db
      .select({ name: catalogBrands.name })
      .from(catalogBrands);
    return new Set(
      rows.map((row) => normalize(row.name)).filter((name) => wanted.has(name)),
    );
  }

  async findExistingCategoryKeys(
    keys: CategoryImportKey[],
  ): Promise<Set<string>> {
    if (keys.length === 0) return new Set();
    const wanted = new Set(keys.map(categoryKey));
    const rows = await this.db.query.catalogCategories.findMany({
      columns: { name: true },
      with: { parentCategory: { columns: { slug: true } } },
    });
    return new Set(
      rows
        .map((row) =>
          categoryKey({
            name: row.name,
            parentCategorySlug: row.parentCategory?.slug ?? null,
          }),
        )
        .filter((key) => wanted.has(key)),
    );
  }
}

export function categoryKey(input: CategoryImportKey): string {
  return `${normalize(input.parentCategorySlug ?? "")}:${normalize(input.name)}`;
}

export function normalize(value: string): string {
  return value.trim().toLowerCase();
}
