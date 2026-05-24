import { SHELL_META } from "./portal-shell-registry.meta";
import { PRIMARY_NAV_REGISTRY } from "./portal-shell-registry.primary";
import { SECONDARY_NAV_REGISTRY } from "./portal-shell-registry.secondary";

export const NAV_REGISTRY = [
  ...PRIMARY_NAV_REGISTRY,
  ...SECONDARY_NAV_REGISTRY,
];

export { SHELL_META };
