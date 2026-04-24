import type { AdminMediaRecord } from "@shop/contracts";
import {
  ALLOWED_MEDIA_MIMES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@shop/contracts";
import {
  confirmAdminMedia,
  presignAdminMedia,
} from "@/lib/react-query/admin-catalog-media";
import { toast } from "@/lib/toast";

export async function uploadSupplierInquiryAttachment(input: {
  entitySlug: string;
  file: File;
  setUploading: (value: boolean) => void;
}): Promise<AdminMediaRecord | null> {
  if (!(ALLOWED_MEDIA_MIMES as readonly string[]).includes(input.file.type)) {
    toast.error(`File type "${input.file.type}" is not supported.`);
    return null;
  }
  if (input.file.size > maxBytes(input.file.type)) {
    toast.error("Attachment exceeds the allowed file size.");
    return null;
  }
  input.setUploading(true);
  try {
    const presign = await presignAdminMedia({
      entitySlug: input.entitySlug,
      entityType: "supplier",
      fileSizeBytes: input.file.size,
      filename: input.file.name,
      mimeType: input.file.type,
    });
    const upload = await fetch(presign.uploadUrl, {
      body: input.file,
      headers: { "Content-Type": input.file.type },
      method: "PUT",
    });
    if (!upload.ok) throw new Error("Upload to storage failed.");
    return await confirmAdminMedia({
      altText: input.file.name,
      entitySlug: input.entitySlug,
      entityType: "supplier",
      fileSizeBytes: input.file.size,
      isPrimary: false,
      key: presign.key,
      mimeType: input.file.type,
      position: 0,
    });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Upload failed.");
    return null;
  } finally {
    input.setUploading(false);
  }
}

function maxBytes(mimeType: string) {
  if (mimeType.startsWith("video/")) return MAX_VIDEO_BYTES;
  if (mimeType === "application/pdf") return MAX_DOCUMENT_BYTES;
  return MAX_IMAGE_BYTES;
}
