import type {
  AdminAuditListQuery,
  AdminAuditListResponse,
  AdminPermissionListQuery,
  AdminPermissionListResponse,
  AdminRoleDetail,
  AdminRoleListQuery,
  AdminRoleListResponse,
} from "@shop/contracts";

export type AdminAccessQueryRepository = {
  getRole(slug: string): Promise<AdminRoleDetail | null>;
  listAudit(input: AdminAuditListQuery): Promise<AdminAuditListResponse>;
  listPermissions(
    input: AdminPermissionListQuery,
  ): Promise<AdminPermissionListResponse>;
  listRoles(input: AdminRoleListQuery): Promise<AdminRoleListResponse>;
};

export class AdminAccessQueryService {
  constructor(private readonly repository: AdminAccessQueryRepository) {}

  async getRole(slug: string) {
    return this.repository.getRole(slug);
  }

  async listAudit(input: AdminAuditListQuery) {
    return this.repository.listAudit(input);
  }

  async listPermissions(input: AdminPermissionListQuery) {
    return this.repository.listPermissions(input);
  }

  async listRoles(input: AdminRoleListQuery) {
    return this.repository.listRoles(input);
  }
}
