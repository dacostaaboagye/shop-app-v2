export const SESSION_FLAG_COOKIE = "shop_session_active";

const PROTECTED_PREFIXES = [
  "/admin",
  "/agent",
  "/customer",
  "/manager",
  "/supplier",
  "/worker",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function buildLoginRedirectFromProtectedPath(
  pathname: string,
  search: string,
  requestUrl: string,
): URL {
  const target = new URL("/login", requestUrl);
  target.searchParams.set("next", `${pathname}${search}`);
  return target;
}
