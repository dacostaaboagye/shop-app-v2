export type GtnDocumentPortal = "admin" | "manager" | "worker";

export function getGtnDocumentPortal(pathname: string): GtnDocumentPortal {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/manager")) return "manager";
  return "worker";
}

export function getGtnDocumentHref(input: {
  pathname: string;
  reference: string;
}): string {
  const portal = getGtnDocumentPortal(input.pathname);
  return `/${portal}/documents/gtns/${encodeURIComponent(input.reference)}`;
}
