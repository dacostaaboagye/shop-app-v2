import type { AdminUserAccessDetail } from "@shop/contracts";

export type AdminUserAccessQueryRepository = {
  getUserAccessDetail(slug: string): Promise<AdminUserAccessDetail | null>;
};

export class AdminUserAccessQueryService {
  constructor(private readonly repository: AdminUserAccessQueryRepository) {}

  async getUserAccessDetail(slug: string) {
    return this.repository.getUserAccessDetail(slug);
  }
}
