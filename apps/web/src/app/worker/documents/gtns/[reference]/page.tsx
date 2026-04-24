import { GtnDocumentPageClient } from "@/components/stock/gtn-document-page-client";

export default async function WorkerGtnDocumentPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <GtnDocumentPageClient
      portal="worker"
      reference={decodeURIComponent(reference)}
    />
  );
}
