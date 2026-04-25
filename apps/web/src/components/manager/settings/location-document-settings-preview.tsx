"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { fetchOfficialDocumentProfile } from "@/lib/react-query/official-documents";

export function EffectiveProfilePreview({
  profile,
}: {
  profile: Awaited<ReturnType<typeof fetchOfficialDocumentProfile>> | undefined;
}) {
  if (!profile) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="px-1 text-sm font-semibold text-muted-foreground">
        Current print profile
      </h3>
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-primary/10">
            <FileText className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Print profile</h4>
            <p className="type-support">Active document configuration</p>
          </div>
        </div>

        <div className="flex flex-col gap-5 text-sm">
          <div className="flex flex-col gap-1">
            <p className="font-bold text-foreground">{profile.brandName}</p>
            <p className="text-pretty text-xs font-medium text-muted-foreground/80">
              {profile.legalName}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="type-data-label">Address</p>
            <div className="text-xs font-medium leading-relaxed text-muted-foreground/80">
              {profile.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PreviewValue label="Phone" value={profile.phone} />
            <PreviewValue label="Email" value={profile.email} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="type-data-label">Footer</p>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-[11px] font-medium italic leading-relaxed text-muted-foreground/80">
              "{profile.footer}"
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              className="rounded-md border-primary bg-primary text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm"
              variant="secondary"
            >
              {profile.currencyCode}
            </Badge>
            <Badge
              className="rounded-md text-[10px] font-bold uppercase tracking-wider"
              variant="outline"
            >
              {profile.paperSize.replace("_", " ")}
            </Badge>
            <Badge
              className="rounded-md text-[10px] font-bold uppercase tracking-wider"
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

function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="type-data-label">{label}</p>
      <p className="break-all text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      {["settings", "preview"].map((key) => (
        <Skeleton className="h-64 w-full" key={key} />
      ))}
    </div>
  );
}
