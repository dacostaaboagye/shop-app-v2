import { UserCreatePageClient } from "@/components/admin/access/user-create-page-client";
import { toRoute } from "@/lib/routes";

const STAFF_CREATE_ROLE_SLUGS = [
  "admin",
  "developer",
  "general-manager",
  "manager",
  "worker",
] as const;

export default function AdminStaffCreatePage() {
  return (
    <UserCreatePageClient
      allowedRoleSlugs={STAFF_CREATE_ROLE_SLUGS}
      backHref={toRoute("/admin/staff")}
      backLabel="Staff"
      description="Add a staff member, optional profile image, and starting role coverage."
      detailHrefBase={toRoute("/admin/users")}
      eyebrow="Staff directory"
      submitLabel="Add staff member"
      submittingLabel="Adding..."
      title="Add staff member"
    />
  );
}
