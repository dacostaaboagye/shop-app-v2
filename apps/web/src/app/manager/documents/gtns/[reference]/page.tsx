import { GtnDocumentPageClient } from "@/components/stock/gtn-document-page-client";

export default async function ManagerGtnDocumentPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <GtnDocumentPageClient
      portal="manager"
      reference={decodeURIComponent(reference)}
    />
  );
}
