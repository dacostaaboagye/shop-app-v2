import { UsersPageClient } from "@/components/admin/users/users-page-client";

export default function AdminUsersPage() {
  return (
    <UsersPageClient
      description="Manage user profiles, contact details, and account settings."
      title="Users"
      userDetailBasePath="/admin/users"
    />
  );
}
