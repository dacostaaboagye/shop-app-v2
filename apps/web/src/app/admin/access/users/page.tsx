import { UsersPageClient } from "@/components/admin/users/users-page-client";

export default function AdminAccessUsersPage() {
  return (
    <UsersPageClient
      description="Inspect role coverage, assigned locations, and portal readiness for each user before applying access changes."
      title="User access"
      userDetailBasePath="/admin/access/users"
    />
  );
}
