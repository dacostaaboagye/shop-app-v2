export type ExistingSuperAdminRow = {
  email: string;
  id: string;
  slug: string;
};

export function resolveExistingSuperAdminUser(
  rows: ExistingSuperAdminRow[],
): ExistingSuperAdminRow | null {
  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  const remainingRows = rows.slice(1);

  if (remainingRows.some((row) => row.id !== firstRow.id)) {
    throw new Error(
      "Cannot seed super admin because the reserved slug and configured email belong to different users.",
    );
  }

  return firstRow;
}
