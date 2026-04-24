import type {
  AdminCategoryListQuery,
  AdminCategoryListResponse,
  AdminCategorySummary,
} from "@shop/contracts";

export type CatalogCategoryQueryRepository = {
  getCategory(slug: string): Promise<AdminCategorySummary | null>;
  listCategories(input: AdminCategoryListQuery): Promise<{
    items: AdminCategorySummary[];
    totalCount: number;
  }>;
};

export class CatalogCategoryQueryService {
  constructor(private readonly repository: CatalogCategoryQueryRepository) {}

  async getCategory(slug: string) {
    return this.repository.getCategory(slug);
  }

  async listCategories(
    input: AdminCategoryListQuery,
  ): Promise<AdminCategoryListResponse> {
    const result = await this.repository.listCategories(input);
    return {
      items: result.items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: result.totalCount,
    };
  }
}
