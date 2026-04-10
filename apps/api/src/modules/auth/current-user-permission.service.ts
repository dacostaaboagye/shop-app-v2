import {
  type AuthPermissionSet,
  authPermissionSetSchema,
} from "@shop/contracts";

export interface CurrentUserPermissionResolver {
  resolvePermissions(input: { userId: string }): Promise<
    Array<{
      key: string;
    }>
  >;
}

export class CurrentUserPermissionService {
  constructor(
    private readonly permissionResolver: CurrentUserPermissionResolver,
  ) {}

  async getCurrentPermissions(userId: string): Promise<AuthPermissionSet> {
    const permissions = await this.permissionResolver.resolvePermissions({
      userId,
    });

    return authPermissionSetSchema.parse({
      permissions: permissions.map((permission) => permission.key),
    });
  }
}
