export type RouteAccess =
  | { kind: "public" }
  | { kind: "authenticated" }
  | {
      kind: "permission";
      permission: string;
      scope?: "any_active" | "contextual";
    };

export type RouteDefinition = {
  access: RouteAccess;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
};
