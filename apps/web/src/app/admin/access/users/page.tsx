import { UsersPageClient } from "@/components/admin/users/users-page-client";
import { toRoute } from "@/lib/routes";

export default function AdminAccessUsersPage() {
  return (
    <UsersPageClient
      createHref={toRoute("/admin/access/users/new")}
      description="Inspect role coverage, assigned locations, and portal readiness for each user before applying access changes."
      title="User access"
      userDetailBasePath="/admin/access/users"
    />
  );
}
