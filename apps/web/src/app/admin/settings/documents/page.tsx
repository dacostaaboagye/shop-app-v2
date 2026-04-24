import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminOfficialDocumentSettingsPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Configure document defaults, numbering prefixes, locale, timezone, and footer text."
      section="documents"
      title="Document settings"
    />
  );
}
