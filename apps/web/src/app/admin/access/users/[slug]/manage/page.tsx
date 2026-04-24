import { UserAccessManagePageClient } from "@/components/admin/access/user-access-manage-page-client";

export default async function AdminUserAccessManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <UserAccessManagePageClient slug={slug} />;
}
