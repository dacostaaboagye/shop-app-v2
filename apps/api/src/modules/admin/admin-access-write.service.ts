import type {
  AdminCreateRoleRequest,
  AdminRoleDetail,
  AdminUpdateRoleRequest,
} from "@shop/contracts";

export type AdminAccessWriteRepository = {
  createRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
  }): Promise<AdminRoleDetail>;
  updateRole(input: {
    actorId: string;
    description: string;
    name: string;
    now: Date;
    permissionKeys: string[];
    slug: string;
  }): Promise<AdminRoleDetail>;
};

export class AdminAccessWriteService {
  constructor(private readonly repository: AdminAccessWriteRepository) {}

  async createRole(actorId: string, input: AdminCreateRoleRequest, now: Date) {
    return this.repository.createRole({ ...input, actorId, now });
  }

  async updateRole(
    actorId: string,
    slug: string,
    input: AdminUpdateRoleRequest,
    now: Date,
  ) {
    return this.repository.updateRole({ ...input, actorId, now, slug });
  }
}
