import type { Route } from "next";
import { toRoute } from "@/lib/routes";

export function getAdminStaffLocationHref(locationSlug: string) {
  return toRoute(
    `/admin/staff?locationSlug=${encodeURIComponent(locationSlug)}` as Route,
  );
}

export function getAdminStaffUserHref(userSlug: string) {
  return toRoute(`/admin/users/${encodeURIComponent(userSlug)}` as Route);
}
