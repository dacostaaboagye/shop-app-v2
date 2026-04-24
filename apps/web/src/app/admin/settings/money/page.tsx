import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminMoneySettingsPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Configure currency and rounding behavior for sales, documents, and future ecommerce."
      section="money"
      title="Money settings"
    />
  );
}
