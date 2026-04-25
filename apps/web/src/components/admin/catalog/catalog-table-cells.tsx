"use client";

import {
  ImagePreviewPlaceholder,
  PreviewImage,
} from "@/components/system/preview-image";
import { Badge } from "@/components/ui/badge";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import { formatCount } from "@/lib/display/format";

export function CatalogImageCell({
  imageUrl,
  title,
}: {
  imageUrl?: string | null | undefined;
  title: string;
}) {
  return imageUrl ? (
    <PreviewImage
      alt={title}
      className="size-10"
      height={40}
      imageClassName="rounded-md"
      previewTitle={title}
      src={imageUrl}
      width={40}
    />
  ) : (
    <ImagePreviewPlaceholder className="size-10" />
  );
}

export function CatalogNameCell({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-balance font-medium text-foreground">{name}</p>
      <p className="type-identifier mt-1 break-all text-muted-foreground">
        {slug}
      </p>
    </div>
  );
}

export function CatalogTextCell({
  value,
  tone = "support",
}: {
  tone?: "identifier" | "support";
  value?: string | null | undefined;
}) {
  if (!value) {
    return <span className="type-support text-muted-foreground">Not set</span>;
  }

  return tone === "identifier" ? (
    <span className="type-identifier break-all text-muted-foreground">
      {value}
    </span>
  ) : (
    <span className="type-support text-pretty text-muted-foreground">
      {value}
    </span>
  );
}

export function CatalogCountCell({ value }: { value: number }) {
  return (
    <span className="type-inline-metric tabular-nums text-foreground">
      {formatCount(value)}
    </span>
  );
}

export function CatalogStatusCell({
  status,
}: {
  status: "active" | "archived";
}) {
  const meta = CATALOG_STATUS_META[status];

  return (
    <Badge className={meta.className} variant="outline">
      {meta.label}
    </Badge>
  );
}

export function CatalogDateCell({ value }: { value: string }) {
  return (
    <span className="type-support tabular-nums text-muted-foreground">
      {formatAdminDate(value)}
    </span>
  );
}
