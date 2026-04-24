import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminBusinessSettingsPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Maintain legal identity and contact details used on official documents."
      section="business"
      title="Business profile"
    />
  );
}
