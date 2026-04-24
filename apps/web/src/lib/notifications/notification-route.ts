import type { Route } from "next";
import { toRoute } from "@/lib/routes";

const PORTAL_ROOTS = [
  "/admin",
  "/manager",
  "/worker",
  "/supplier",
  "/agent",
] as const;

export function getNotificationCenterHref(pathname: string): Route {
  for (const root of PORTAL_ROOTS) {
    if (pathname === root || pathname.startsWith(`${root}/`)) {
      return toRoute(`${root}/notifications`);
    }
  }

  return toRoute("/admin/notifications");
}
