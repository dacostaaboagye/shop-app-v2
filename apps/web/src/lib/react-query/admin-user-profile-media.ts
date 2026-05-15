import {
  type AdminMediaRecord,
  ALLOWED_PROFILE_IMAGE_MIMES,
  MAX_IMAGE_BYTES,
} from "@shop/contracts";
import {
  confirmAdminMedia,
  presignAdminMedia,
} from "@/lib/react-query/admin-catalog-media";

export type ProfileImageFileInput = Pick<File, "size" | "type"> | null;

export function validateProfileImageFile(file: ProfileImageFileInput) {
  if (!file) return undefined;

  if (!(ALLOWED_PROFILE_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    return "Profile image must be JPEG, PNG, WebP, GIF, or AVIF.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Profile image must be 10 MB or smaller.";
  }

  return undefined;
}

export async function uploadAdminUserProfileImage(input: {
  altText: string;
  file: File;
  userSlug: string;
}): Promise<AdminMediaRecord> {
  const validationError = validateProfileImageFile(input.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const presign = await presignAdminMedia({
    entitySlug: input.userSlug,
    entityType: "user",
    fileSizeBytes: input.file.size,
    filename: input.file.name,
    mimeType: input.file.type,
  });
  const upload = await fetch(presign.uploadUrl, {
    body: input.file,
    headers: { "Content-Type": input.file.type },
    method: "PUT",
  });

  if (!upload.ok) {
    throw new Error("Upload to storage failed.");
  }

  return confirmAdminMedia({
    altText: input.altText,
    entitySlug: input.userSlug,
    entityType: "user",
    fileSizeBytes: input.file.size,
    isPrimary: true,
    key: presign.key,
    mimeType: input.file.type,
    position: 0,
  });
}
