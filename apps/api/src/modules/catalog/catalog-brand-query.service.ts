import type {
  AdminBrandListQuery,
  AdminBrandListResponse,
  AdminBrandSummary,
} from "@shop/contracts";

export type CatalogBrandQueryRepository = {
  getBrand(slug: string): Promise<AdminBrandSummary | null>;
  listBrands(input: AdminBrandListQuery): Promise<{
    items: AdminBrandSummary[];
    totalCount: number;
  }>;
};

export class CatalogBrandQueryService {
  constructor(private readonly repository: CatalogBrandQueryRepository) {}

  async getBrand(slug: string) {
    return this.repository.getBrand(slug);
  }

  async listBrands(
    input: AdminBrandListQuery,
  ): Promise<AdminBrandListResponse> {
    const result = await this.repository.listBrands(input);
    return {
      items: result.items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: result.totalCount,
    };
  }
}
