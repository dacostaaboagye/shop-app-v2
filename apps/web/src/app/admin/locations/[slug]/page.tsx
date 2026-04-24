import { LocationDetailPageClient } from "@/components/admin/locations/location-detail-page-client";

export default async function AdminLocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <LocationDetailPageClient slug={slug} />;
}
