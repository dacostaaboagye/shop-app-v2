export type DiffResult<T extends Record<string, unknown>> = {
  changedFields: string[];
  before: Partial<T>;
  after: Partial<T>;
};

/**
 * Compute the per-field delta between two snapshots, scoped to an explicit
 * tracked-fields allowlist. Untracked fields (e.g. internal cache columns,
 * `updatedAt`) are ignored. Equality is reference-equal for primitives and
 * structural for plain objects/arrays via JSON.stringify.
 *
 * Returns:
 * - changedFields: ordered list of field names that differ
 * - before / after: subset snapshots containing only the changed fields
 *
 * `changedFields.length === 0` means no meaningful change — the caller
 * should short-circuit and skip the log emit.
 */
export function diffSnapshot<T extends Record<string, unknown>>(
  before: T,
  after: T,
  trackedFields: readonly (keyof T & string)[],
): DiffResult<T> {
  const changedFields: string[] = [];
  const beforeSubset: Partial<T> = {};
  const afterSubset: Partial<T> = {};
  for (const field of trackedFields) {
    const previous = before[field];
    const next = after[field];
    if (!isEqual(previous, next)) {
      changedFields.push(field);
      beforeSubset[field] = previous;
      afterSubset[field] = next;
    }
  }
  return { changedFields, before: beforeSubset, after: afterSubset };
}

function isEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return JSON.stringify(left) === JSON.stringify(right);
}
