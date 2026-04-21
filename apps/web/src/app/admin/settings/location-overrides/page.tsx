import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminLocationOverrideSettingsPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Control which document fields location managers may override locally."
      section="overrides"
      title="Location override policy"
    />
  );
}
