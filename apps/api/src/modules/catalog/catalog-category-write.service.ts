import type {
  AdminCreateCategoryRequest,
  AdminCreateCategoryResponse,
  AdminUpdateCategoryRequest,
  AdminUpdateCategoryResponse,
} from "@shop/contracts";

export type CatalogCategoryWriteRepository = {
  createCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCategoryRequest;
  }): Promise<AdminCreateCategoryResponse>;
  updateCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCategoryRequest;
    slug: string;
  }): Promise<AdminUpdateCategoryResponse | null>;
  deleteCategory(input: { slug: string }): Promise<void>;
};

export class CatalogCategoryWriteService {
  constructor(private readonly repository: CatalogCategoryWriteRepository) {}

  async createCategory(
    actorId: string,
    payload: AdminCreateCategoryRequest,
    now: Date,
  ) {
    return this.repository.createCategory({ actorId, now, payload });
  }

  async updateCategory(
    actorId: string,
    slug: string,
    payload: AdminUpdateCategoryRequest,
    now: Date,
  ) {
    return this.repository.updateCategory({ actorId, now, payload, slug });
  }

  async deleteCategory(slug: string) {
    return this.repository.deleteCategory({ slug });
  }
}
