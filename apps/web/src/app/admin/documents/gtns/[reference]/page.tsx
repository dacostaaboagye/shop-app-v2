import { GtnDocumentPageClient } from "@/components/stock/gtn-document-page-client";

export default async function AdminGtnDocumentPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <GtnDocumentPageClient
      portal="admin"
      reference={decodeURIComponent(reference)}
    />
  );
}
