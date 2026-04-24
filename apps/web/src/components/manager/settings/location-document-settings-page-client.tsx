"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchLocationDocumentSettings,
  fetchOfficialDocumentProfile,
  locationDocumentSettingsQueryKey,
  officialDocumentProfileQueryKey,
  updateLocationDocumentSettings,
} from "@/lib/react-query/official-documents";
import { LocationDocumentSettingsForm } from "./location-document-settings-form";
import {
  EffectiveProfilePreview,
  SettingsSkeleton,
} from "./location-document-settings-preview";

export function LocationDocumentSettingsPageClient() {
  const queryClient = useQueryClient();
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("settings.location_documents.manage");
  const locationId = selectedLocationScope?.locationId ?? "";
  const settingsQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchLocationDocumentSettings(locationId),
    queryKey: locationDocumentSettingsQueryKey(locationId),
  });
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => fetchOfficialDocumentProfile(locationId),
    queryKey: officialDocumentProfileQueryKey(locationId),
  });
  const mutation = useMutation({
    mutationFn: (
      payload: Parameters<typeof updateLocationDocumentSettings>[0]["payload"],
    ) => updateLocationDocumentSettings({ locationId, payload }),
    onSuccess(data) {
      queryClient.setQueryData(
        locationDocumentSettingsQueryKey(locationId),
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: officialDocumentProfileQueryKey(locationId),
      });
      toast.success("Location document settings saved.");
    },
  });

  return (
    <PageShell>
      <PageHeader
        actions={<Badge variant="secondary">Location configuration</Badge>}
        description="Control branch-specific printed contact details and receipt behavior."
        title="Location documents"
      />
      <LocationScopePanel
        description="Choose the managed location whose printed document details you want to configure."
        emptyDescription="No managed location is available for document settings."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />
      <LocationSettingsContent
        isSelected={!!selectedLocationScope}
        mutationError={mutation.error}
        onRetry={() => {
          void settingsQuery.refetch();
          void profileQuery.refetch();
        }}
        onSubmit={(payload) => mutation.mutate(payload)}
        profile={profileQuery.data}
        queryError={settingsQuery.error ?? profileQuery.error}
        queryState={getQueryState(settingsQuery.status, profileQuery.status)}
        settings={settingsQuery.data}
        isSaving={mutation.isPending}
      />
    </PageShell>
  );
}

function LocationSettingsContent({
  isSaving,
  isSelected,
  mutationError,
  onRetry,
  onSubmit,
  profile,
  queryError,
  queryState,
  settings,
}: {
  isSaving: boolean;
  isSelected: boolean;
  mutationError: Error | null;
  onRetry: () => void;
  onSubmit: Parameters<typeof LocationDocumentSettingsForm>[0]["onSubmit"];
  profile: Awaited<ReturnType<typeof fetchOfficialDocumentProfile>> | undefined;
  queryError: Error | null;
  queryState: "error" | "pending" | "success";
  settings:
    | Awaited<ReturnType<typeof fetchLocationDocumentSettings>>
    | undefined;
}) {
  if (!isSelected) return null;
  if (queryState === "pending") return <SettingsSkeleton />;
  if (queryState === "error" || !settings) {
    return (
      <AppErrorBanner
        detail="Could not load location document settings."
        error={queryError}
        onRetry={onRetry}
        title="Unable to load settings"
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4">
        {mutationError ? (
          <AppErrorBanner
            detail="Could not save location document settings."
            error={mutationError}
            title="Unable to save settings"
          />
        ) : null}
        <LocationDocumentSettingsForm
          key={settings.updatedAt ?? settings.locationId}
          isSaving={isSaving}
          locationName={settings.locationName}
          onSubmit={onSubmit}
          settings={settings}
        />
      </div>
      <EffectiveProfilePreview profile={profile} />
    </div>
  );
}

function getQueryState(
  settingsState: "error" | "pending" | "success",
  profileState: "error" | "pending" | "success",
) {
  if (settingsState === "error" || profileState === "error") return "error";
  if (settingsState === "pending" || profileState === "pending")
    return "pending";
  return "success";
}
