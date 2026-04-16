import type {
  AdminCreateBrandRequest,
  AdminCreateBrandResponse,
  AdminUpdateBrandRequest,
  AdminUpdateBrandResponse,
} from "@shop/contracts";

export type CatalogBrandWriteRepository = {
  createBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateBrandRequest;
  }): Promise<AdminCreateBrandResponse>;
  updateBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateBrandRequest;
    slug: string;
  }): Promise<AdminUpdateBrandResponse | null>;
  deleteBrand(input: { slug: string }): Promise<void>;
};

export class CatalogBrandWriteService {
  constructor(private readonly repository: CatalogBrandWriteRepository) {}

  async createBrand(
    actorId: string,
    payload: AdminCreateBrandRequest,
    now: Date,
  ) {
    return this.repository.createBrand({ actorId, now, payload });
  }

  async updateBrand(
    actorId: string,
    slug: string,
    payload: AdminUpdateBrandRequest,
    now: Date,
  ) {
    return this.repository.updateBrand({ actorId, now, payload, slug });
  }

  async deleteBrand(slug: string) {
    return this.repository.deleteBrand({ slug });
  }
}
