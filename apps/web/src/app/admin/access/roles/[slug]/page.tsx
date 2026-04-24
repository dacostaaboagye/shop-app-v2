import { RoleDetailPageClient } from "@/components/admin/access/role-detail-page-client";

export default async function AdminAccessRoleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <RoleDetailPageClient slug={slug} />;
}
