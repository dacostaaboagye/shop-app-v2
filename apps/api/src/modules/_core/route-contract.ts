export type RouteAccess =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "permission"; permission: string };

export type RouteDefinition = {
  access: RouteAccess;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
};
