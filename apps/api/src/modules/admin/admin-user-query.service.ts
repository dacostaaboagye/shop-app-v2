import type {
  AdminRoleOption,
  AdminUserListQuery,
  AdminUserSummary,
} from "@shop/contracts";

export type AdminUserQueryRepository = {
  listUsers(input: AdminUserListQuery): Promise<{
    availableRoles: AdminRoleOption[];
    items: AdminUserSummary[];
    totalCount: number;
  }>;
};

export class AdminUserQueryService {
  constructor(private readonly repository: AdminUserQueryRepository) {}

  async listUsers(input: AdminUserListQuery) {
    return this.repository.listUsers(input);
  }
}
