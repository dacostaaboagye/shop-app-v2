"use client";

import { APPLICATION_BRAND_MEDIA_ENTITY } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MediaPanel } from "@/components/admin/catalog/media/media-panel";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOfficialDocumentSettings,
  officialDocumentSettingsQueryKey,
  updateOfficialDocumentSettings,
} from "@/lib/react-query/official-documents";
import {
  OfficialDocumentSettingsForm,
  type OfficialDocumentSettingsSection,
} from "./official-document-settings-form";

const SKELETON_KEYS = [1, 2, 3];

type PageConfig = {
  description: string;
  section: OfficialDocumentSettingsSection;
  title: string;
};

export function OfficialDocumentSettingsPageClient({
  description,
  section,
  title,
}: PageConfig) {
  const queryClient = useQueryClient();
  const { can, canAny } = useAuthorization();
  const canManageSettings = can("settings.documents.manage");
  const canManageMedia = can("catalog.media.manage");
  const canViewMedia = canAny(["catalog.view", "catalog.media.manage"]);
  const settingsQuery = useQuery({
    queryFn: fetchOfficialDocumentSettings,
    queryKey: officialDocumentSettingsQueryKey,
  });
  const mutation = useMutation({
    mutationFn: updateOfficialDocumentSettings,
    onSuccess(data) {
      queryClient.setQueryData(officialDocumentSettingsQueryKey, data);
      void queryClient.invalidateQueries({
        queryKey: ["official-documents", "profile"],
      });
      toast.success("Official document settings saved.");
    },
  });

  return (
    <PageShell>
      <PageHeader
        actions={<Badge variant="secondary">Production configuration</Badge>}
        description={description}
        title={title}
      />

      {settingsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          {SKELETON_KEYS.map((key) => (
            <Skeleton className="h-40 w-full" key={key} />
          ))}
        </div>
      ) : settingsQuery.isError ? (
        <AppErrorBanner
          detail="Could not load official document settings."
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
          title="Unable to load settings"
        />
      ) : (
        <>
          {mutation.isError ? (
            <AppErrorBanner
              detail="Could not save official document settings."
              error={mutation.error}
              onRetry={() => mutation.reset()}
              title="Unable to save settings"
            />
          ) : null}
          <OfficialDocumentSettingsForm
            canManage={canManageSettings}
            key={`${section}-${settingsQuery.data.updatedAt ?? "defaults"}`}
            isSaving={mutation.isPending}
            onSubmit={(payload) => mutation.mutate(payload)}
            section={section}
            settings={settingsQuery.data}
          />
          {section === "brand" && canViewMedia ? (
            <MediaPanel
              canManage={canManageMedia}
              entitySlug={APPLICATION_BRAND_MEDIA_ENTITY.entitySlug}
              entityType={APPLICATION_BRAND_MEDIA_ENTITY.entityType}
            />
          ) : null}
        </>
      )}
    </PageShell>
  );
}
