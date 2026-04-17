import { UserAccessDetailPageClient } from "@/components/admin/access/user-access-detail-page-client";

export default async function AdminAccessUserDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <UserAccessDetailPageClient slug={slug} />;
}
