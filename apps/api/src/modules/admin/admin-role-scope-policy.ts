export function roleRequiresLocationScope(roleSlug: string) {
  return (
    roleSlug === "agent" || roleSlug === "manager" || roleSlug === "worker"
  );
}
