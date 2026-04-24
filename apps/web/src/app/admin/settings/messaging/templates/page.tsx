import { OfficialDocumentSettingsPageClient } from "@/components/admin/settings/official-document-settings-page-client";

export default function AdminMessagingEmailTemplatesPage() {
  return (
    <OfficialDocumentSettingsPageClient
      description="Configure transactional email wording with live previews before supplier invites and account emails are sent."
      section="email"
      title="Email templates"
    />
  );
}
