import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminBrandSettingsPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Configure the brand identity used in the portal and official documents."
      section="brand"
      title="Brand settings"
    />
  );
}
