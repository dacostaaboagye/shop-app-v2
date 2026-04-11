import type {
  AdminProductDetail,
  AdminProductListQuery,
  AdminProductListResponse,
  AdminProductSummary,
} from "@shop/contracts";

export type CatalogProductQueryRepository = {
  getProduct(slug: string): Promise<AdminProductDetail | null>;
  listProducts(input: AdminProductListQuery): Promise<{
    items: AdminProductSummary[];
    totalCount: number;
  }>;
};

export class CatalogProductQueryService {
  constructor(private readonly repository: CatalogProductQueryRepository) {}

  async getProduct(slug: string) {
    return this.repository.getProduct(slug);
  }

  async listProducts(
    input: AdminProductListQuery,
  ): Promise<AdminProductListResponse> {
    const result = await this.repository.listProducts(input);
    return {
      items: result.items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: result.totalCount,
    };
  }
}
