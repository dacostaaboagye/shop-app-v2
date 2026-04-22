import type {
  AdminSupplierDetail,
  AdminSupplierListQuery,
  AdminSupplierSummary,
} from "@shop/contracts";

export type AdminSupplierQueryRepository = {
  getSupplier(slug: string): Promise<AdminSupplierDetail | null>;
  listSuppliers(input: AdminSupplierListQuery): Promise<{
    items: AdminSupplierSummary[];
    totalCount: number;
  }>;
};

export class AdminSupplierQueryService {
  constructor(private readonly repository: AdminSupplierQueryRepository) {}

  async getSupplier(slug: string) {
    return this.repository.getSupplier(slug);
  }

  async listSuppliers(input: AdminSupplierListQuery) {
    return this.repository.listSuppliers(input);
  }
}
