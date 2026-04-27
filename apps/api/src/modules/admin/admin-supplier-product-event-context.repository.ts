import { suppliers } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { SupplierProductEventContext } from "./admin-supplier-events.js";
import { listSupplierProducts } from "./postgres-admin-supplier-query.support.js";

export type AdminSupplierProductEventContextRepository = {
  getSupplierProductEventContext(input: {
    productSlug: string;
    supplierSlug: string;
  }): Promise<SupplierProductEventContext | null>;
};

export class PostgresAdminSupplierProductEventContextRepository
  implements AdminSupplierProductEventContextRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getSupplierProductEventContext(input: {
    productSlug: string;
    supplierSlug: string;
  }): Promise<SupplierProductEventContext | null> {
    const [supplier] = await this.db
      .select({ id: suppliers.id, name: suppliers.name, slug: suppliers.slug })
      .from(suppliers)
      .where(eq(suppliers.slug, input.supplierSlug))
      .limit(1);

    if (!supplier) {
      return null;
    }

    const products = await listSupplierProducts(this.db, supplier.id);
    const product = products.find(
      (row) => row.productSlug === input.productSlug,
    );

    if (!product) {
      return null;
    }

    return {
      brandName: product.brandName,
      categoryName: product.categoryName,
      productName: product.productName,
      productSlug: product.productSlug,
      supplierName: supplier.name,
      supplierSlug: supplier.slug,
      variantCount: product.variantCount,
    };
  }
}
