"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOfficialDocumentSettings,
  officialDocumentSettingsQueryKey,
} from "@/lib/react-query/official-documents";
import { EmailOperationsPanel } from "./email-operations-panel";

export function EmailOperationsPageClient() {
  const { can } = useAuthorization();
  const settingsQuery = useQuery({
    queryFn: fetchOfficialDocumentSettings,
    queryKey: officialDocumentSettingsQueryKey,
  });

  return (
    <PageShell>
      <PageHeader
        description="Monitor delivery mode, recent activity, and send branded test emails through the current messaging runtime."
        title="Email operations"
      />
      {settingsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : settingsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load email operations."
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
          title="Email operations unavailable"
        />
      ) : (
        <EmailOperationsPanel
          canManage={can("settings.documents.manage")}
          defaultTargetEmail={settingsQuery.data.business.email}
        />
      )}
    </PageShell>
  );
}
