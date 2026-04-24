import {
  type AuthPermissionSet,
  authPermissionSetSchema,
} from "@shop/contracts";

export interface CurrentUserPermissionResolver {
  resolveAllPermissions(input: { userId: string }): Promise<{
    anyActivePermissions: Array<{ key: string }>;
    locationScopes: Array<{
      locationId: string;
      locationName: string;
      locationSlug: string;
      permissions: Array<{ key: string }>;
    }>;
  }>;
}

export class CurrentUserPermissionService {
  constructor(
    private readonly permissionResolver: CurrentUserPermissionResolver,
  ) {}

  async getCurrentPermissions(userId: string): Promise<AuthPermissionSet> {
    const { anyActivePermissions, locationScopes } =
      await this.permissionResolver.resolveAllPermissions({ userId });

    return authPermissionSetSchema.parse({
      permissions: anyActivePermissions.map((p) => p.key),
      locationScopes: locationScopes.map((scope) => ({
        locationId: scope.locationId,
        locationName: scope.locationName,
        locationSlug: scope.locationSlug,
        permissions: scope.permissions.map((p) => p.key),
      })),
    });
  }
}
