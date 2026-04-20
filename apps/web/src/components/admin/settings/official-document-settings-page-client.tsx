"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOfficialDocumentSettings,
  officialDocumentSettingsQueryKey,
  updateOfficialDocumentSettings,
} from "@/lib/react-query/official-documents";
import { OfficialDocumentSettingsForm } from "./official-document-settings-form";
import { toast } from "sonner";

const SKELETON_KEYS = [1, 2, 3];

export function OfficialDocumentSettingsPageClient() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryFn: fetchOfficialDocumentSettings,
    queryKey: officialDocumentSettingsQueryKey,
  });
  const mutation = useMutation({
    mutationFn: updateOfficialDocumentSettings,
    onSuccess(data) {
      queryClient.setQueryData(officialDocumentSettingsQueryKey, data);
      toast.success("Official document settings saved.");
    },
  });

  return (
    <PageShell>
      <PageHeader
        actions={<Badge variant="secondary">Production configuration</Badge>}
        description="Configure official document identity, money defaults, and receipt behavior for the platform."
        title="Official documents"
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
            key={settingsQuery.data.updatedAt ?? "defaults"}
            isSaving={mutation.isPending}
            onSubmit={(payload) => mutation.mutate(payload)}
            settings={settingsQuery.data}
          />
        </>
      )}
    </PageShell>
  );
}
