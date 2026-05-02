import type {
  AdminCreateProductRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
} from "@shop/contracts";
import type { CatalogProductCommands } from "./postgres-catalog-product-write.commands.js";

export type CatalogProductRepository = {
  createProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateProductRequest;
  }): Promise<AdminProductDetail>;
  updateProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateProductRequest;
    slug: string;
  }): Promise<AdminProductDetail | null>;
  getProductForDeleteEvent(slug: string): Promise<AdminProductDetail | null>;
  deleteProduct(input: {
    actorId: string;
    now: Date;
    slug: string;
  }): Promise<void>;
};

export class PostgresCatalogProductWriteRepository
  implements CatalogProductRepository
{
  constructor(private readonly commands: CatalogProductCommands) {}

  async createProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateProductRequest;
  }) {
    return this.commands.create(input);
  }

  async updateProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateProductRequest;
    slug: string;
  }): Promise<AdminProductDetail | null> {
    return this.commands.update(input);
  }

  async getProductForDeleteEvent(
    slug: string,
  ): Promise<AdminProductDetail | null> {
    return this.commands.getProductForDeleteEvent(slug);
  }

  async deleteProduct(input: {
    actorId: string;
    now: Date;
    slug: string;
  }): Promise<void> {
    return this.commands.delete(input);
  }
}
