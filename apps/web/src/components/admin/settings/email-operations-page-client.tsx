"use client";

import { useAuthorization } from "@/components/providers/authorization-provider";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { EmailOperationsPanel } from "./email-operations-panel";

export function EmailOperationsPageClient() {
  const { can } = useAuthorization();

  return (
    <PageShell>
      <PageHeader
        description="Monitor delivery mode, recent activity, and send branded test emails through the current messaging runtime."
        title="Email operations"
      />
      <EmailOperationsPanel canManage={can("settings.documents.manage")} />
    </PageShell>
  );
}
