import type {
  AdminCustomerDetail,
  AdminCustomerListQuery,
  AdminCustomerSummary,
} from "@shop/contracts";

export type AdminCustomerQueryRepository = {
  getCustomer(slug: string): Promise<AdminCustomerDetail | null>;
  listCustomers(input: AdminCustomerListQuery): Promise<{
    items: AdminCustomerSummary[];
    totalCount: number;
  }>;
};

export class AdminCustomerQueryService {
  constructor(private readonly repository: AdminCustomerQueryRepository) {}

  async getCustomer(slug: string) {
    return this.repository.getCustomer(slug);
  }

  async listCustomers(input: AdminCustomerListQuery) {
    return this.repository.listCustomers(input);
  }
}
