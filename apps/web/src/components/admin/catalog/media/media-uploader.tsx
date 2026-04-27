"use client";

import {
  ALLOWED_MEDIA_MIMES,
  type CatalogMediaEntityType,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@shop/contracts";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  confirmAdminMedia,
  presignAdminMedia,
} from "@/lib/react-query/admin-catalog-media";
import { toast } from "@/lib/toast";

type Props = {
  accept?: readonly string[];
  canManage: boolean;
  entitySlug: string;
  entityType: CatalogMediaEntityType;
  nextPosition: number;
  onSuccess: () => void;
  onUploadFile?: (input: { file: File; nextPosition: number }) => Promise<void>;
  uploadingLabel?: string;
};

export function MediaUploader({
  accept = ALLOWED_MEDIA_MIMES,
  canManage,
  entitySlug,
  entityType,
  nextPosition,
  onSuccess,
  onUploadFile,
  uploadingLabel = "Uploading...",
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files.item(0);
    if (!file) return;

    if (!(accept as readonly string[]).includes(file.type)) {
      toast.error(`File type "${file.type}" is not supported.`);
      return;
    }

    const isDocument = file.type === "application/pdf";
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo
      ? MAX_VIDEO_BYTES
      : isDocument
        ? MAX_DOCUMENT_BYTES
        : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      toast.error(
        `File exceeds the ${isVideo ? "100 MB video" : isDocument ? "25 MB document" : "10 MB image"} limit.`,
      );
      return;
    }

    setUploading(true);
    try {
      if (onUploadFile) {
        await onUploadFile({ file, nextPosition });
        onSuccess();
        return;
      }

      const presign = await presignAdminMedia({
        entitySlug,
        entityType,
        fileSizeBytes: file.size,
        filename: file.name,
        mimeType: file.type,
      });

      const upload = await fetch(presign.uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });
      if (!upload.ok) throw new Error("Upload to storage failed.");

      await confirmAdminMedia({
        entitySlug,
        entityType,
        fileSizeBytes: file.size,
        isPrimary: false,
        key: presign.key,
        mimeType: file.type,
        position: nextPosition,
      });

      onSuccess();
      toast.success("Media uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="flex items-center gap-2">
      <Input
        accept={accept.join(",")}
        className="cursor-pointer"
        disabled={uploading}
        onChange={(event) => void handleFiles(event.target.files)}
        type="file"
      />
      {uploading ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {uploadingLabel}
        </span>
      ) : null}
    </div>
  );
}
