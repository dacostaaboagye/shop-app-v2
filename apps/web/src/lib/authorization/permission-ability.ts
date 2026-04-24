import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

const FALLBACK_PERMISSION_ACTION = "access";

export type PermissionAbilityAction = string;
export type PermissionAbilitySubject = string;
export type PermissionAbilityTuple = [
  PermissionAbilityAction,
  PermissionAbilitySubject,
];
export type PermissionAbility = MongoAbility<PermissionAbilityTuple>;

export type PermissionDescriptor = {
  action: PermissionAbilityAction;
  permission: string;
  subject: PermissionAbilitySubject;
};

export function createEmptyPermissionAbility(): PermissionAbility {
  return createMongoAbility<PermissionAbilityTuple>([]);
}

export function createPermissionAbility(
  permissions: readonly string[],
): PermissionAbility {
  const { build, can } = new AbilityBuilder<PermissionAbility>(
    createMongoAbility,
  );

  for (const descriptor of uniquePermissionDescriptors(permissions)) {
    can(descriptor.action, descriptor.subject);
  }

  return build();
}

export function parsePermissionKey(permission: string): PermissionDescriptor {
  const normalizedPermission = permission.trim();
  const segments = normalizedPermission.split(".").filter(Boolean);

  if (segments.length < 2) {
    return {
      action: FALLBACK_PERMISSION_ACTION,
      permission: normalizedPermission,
      subject: normalizedPermission,
    };
  }

  return {
    action: segments.at(-1) ?? FALLBACK_PERMISSION_ACTION,
    permission: normalizedPermission,
    subject: segments.slice(0, -1).join("."),
  };
}

export function canUsePermission(
  ability: Pick<PermissionAbility, "can">,
  permission: string,
): boolean {
  const descriptor = parsePermissionKey(permission);
  return ability.can(descriptor.action, descriptor.subject);
}

export function canUseAnyPermission(
  ability: Pick<PermissionAbility, "can">,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) =>
    canUsePermission(ability, permission),
  );
}

export function canUseAllPermissions(
  ability: Pick<PermissionAbility, "can">,
  permissions: readonly string[],
): boolean {
  return permissions.every((permission) =>
    canUsePermission(ability, permission),
  );
}

function uniquePermissionDescriptors(permissions: readonly string[]) {
  const descriptors = new Map<string, PermissionDescriptor>();

  for (const permission of permissions) {
    const normalizedPermission = permission.trim();

    if (normalizedPermission === "") {
      continue;
    }

    descriptors.set(
      normalizedPermission,
      parsePermissionKey(normalizedPermission),
    );
  }

  return [...descriptors.values()];
}
