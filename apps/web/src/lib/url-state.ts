type SearchParamsLike = Pick<URLSearchParams, "get" | "toString">;

export type QueryParamUpdates = Record<
  string,
  number | string | null | undefined
>;

export function readStringParam(
  searchParams: SearchParamsLike,
  key: string,
): string {
  return searchParams.get(key)?.trim() ?? "";
}

export function readEnumParam<TValue extends string>(
  searchParams: SearchParamsLike,
  key: string,
  allowedValues: readonly TValue[],
  fallback: TValue,
): TValue {
  const value = searchParams.get(key);

  if (!value) {
    return fallback;
  }

  return allowedValues.includes(value as TValue) ? (value as TValue) : fallback;
}

export function readPositiveIntParam(
  searchParams: SearchParamsLike,
  key: string,
  fallback: number,
): number {
  const rawValue = searchParams.get(key);

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export function buildSearchParams(
  searchParams: SearchParamsLike,
  updates: QueryParamUpdates,
): string {
  const nextSearchParams = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === "") {
      nextSearchParams.delete(key);
      continue;
    }

    nextSearchParams.set(key, String(value));
  }

  return nextSearchParams.toString();
}

export function getPageCount(totalCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
