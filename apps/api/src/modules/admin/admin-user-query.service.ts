import type {
  AdminRoleOption,
  AdminStaffListQuery,
  AdminUserListQuery,
  AdminUserSummary,
} from "@shop/contracts";

export type AdminUserQueryRepository = {
  listUsers(input: AdminUserListQuery): Promise<{
    availableRoles: AdminRoleOption[];
    items: AdminUserSummary[];
    totalCount: number;
  }>;
  listStaff(input: AdminStaffListQuery): Promise<{
    items: AdminUserSummary[];
    totalCount: number;
  }>;
};

export class AdminUserQueryService {
  constructor(private readonly repository: AdminUserQueryRepository) {}

  async listUsers(input: AdminUserListQuery) {
    return this.repository.listUsers(input);
  }

  async listStaff(input: AdminStaffListQuery) {
    return this.repository.listStaff(input);
  }
}
