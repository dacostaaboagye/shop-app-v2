import { UserProfilePageClient } from "@/components/admin/users/user-profile-page-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <UserProfilePageClient slug={slug} />;
}
