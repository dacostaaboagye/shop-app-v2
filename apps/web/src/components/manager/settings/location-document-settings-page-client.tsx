"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchLocationDocumentSettings,
  fetchOfficialDocumentProfile,
  locationDocumentSettingsQueryKey,
  officialDocumentProfileQueryKey,
  updateLocationDocumentSettings,
} from "@/lib/react-query/official-documents";
import { LocationDocumentSettingsForm } from "./location-document-settings-form";

const SKELETON_KEYS = ["settings", "preview"];

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

function EffectiveProfilePreview({
  profile,
}: {
  profile: Awaited<ReturnType<typeof fetchOfficialDocumentProfile>> | undefined;
}) {
  if (!profile) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">
        Current print profile
      </h3>
      <div className="rounded-xl border border-border/50 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10">
            <FileText className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Print profile</h4>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Active document configuration
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 text-sm">
          <div className="flex flex-col gap-1">
            <p className="font-bold text-foreground">{profile.brandName}</p>
            <p className="text-xs font-medium text-muted-foreground/80">
              {profile.legalName}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Address
            </p>
            <div className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
              {profile.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Phone
              </p>
              <p className="text-xs font-bold text-foreground">
                {profile.phone}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Email
              </p>
              <p className="text-xs font-bold text-foreground truncate">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Footer
            </p>
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 text-[11px] font-medium text-muted-foreground/80 leading-relaxed italic">
              "{profile.footer}"
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="secondary"
            >
              {profile.currencyCode}
            </Badge>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="outline"
            >
              {profile.paperSize.replace("_", " ")}
            </Badge>
            <Badge
              className="rounded-md font-bold uppercase tracking-wider text-[10px]"
              variant="outline"
            >
              {profile.timezone}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {SKELETON_KEYS.map((key) => (
        <Skeleton className="h-64 w-full" key={key} />
      ))}
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
