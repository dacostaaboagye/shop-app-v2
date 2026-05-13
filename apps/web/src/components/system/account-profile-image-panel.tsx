"use client";

import { ALLOWED_PROFILE_IMAGE_MIMES, MAX_IMAGE_BYTES } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MediaGallery } from "@/components/admin/catalog/media/media-gallery";
import { MediaUploader } from "@/components/admin/catalog/media/media-uploader";
import { PersonAvatar } from "@/components/system/person-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  accountProfileMediaQueryKey,
  confirmAccountProfileMedia,
  deleteAccountProfileMedia,
  fetchAccountProfileMedia,
  presignAccountProfileMedia,
  setAccountProfileMediaPrimary,
} from "@/lib/react-query/account-profile-media";

type AccountProfileImagePanelProps = {
  firstName: string;
  imageUrl?: string | null;
  lastName: string;
  onProfileChanged: () => Promise<void>;
};

export function AccountProfileImagePanel({
  firstName,
  imageUrl,
  lastName,
  onProfileChanged,
}: AccountProfileImagePanelProps) {
  const queryClient = useQueryClient();
  const profileMediaQuery = useQuery({
    queryFn: fetchAccountProfileMedia,
    queryKey: accountProfileMediaQueryKey,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAccountProfileMedia,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: accountProfileMediaQueryKey,
      });
      await onProfileChanged();
      toast.success("Profile image removed.");
    },
    onError() {
      toast.error("Profile image could not be removed.");
    },
  });
  const setPrimaryMutation = useMutation({
    mutationFn: setAccountProfileMediaPrimary,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: accountProfileMediaQueryKey,
      });
      await onProfileChanged();
      toast.success("Profile image updated.");
    },
    onError() {
      toast.error("Profile image could not be updated.");
    },
  });

  const mediaItems = profileMediaQuery.data?.items ?? [];

  async function handleUpload(input: { file: File; nextPosition: number }) {
    const { file } = input;

    if (!file.type.startsWith("image/")) {
      toast.error("Profile image must be a supported image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Profile image exceeds the 10 MB image limit.");
      return;
    }

    try {
      const presign = await presignAccountProfileMedia({
        fileSizeBytes: file.size,
        filename: file.name,
        mimeType: file.type,
      });
      const upload = await fetch(presign.uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });

      if (!upload.ok) {
        throw new Error("Upload to storage failed.");
      }

      const confirmed = await confirmAccountProfileMedia({
        fileSizeBytes: file.size,
        key: presign.key,
        mimeType: file.type,
      });

      if (!confirmed.isPrimary) {
        await setPrimaryMutation.mutateAsync(confirmed.assignmentId);
      } else {
        await queryClient.invalidateQueries({
          queryKey: accountProfileMediaQueryKey,
        });
        await onProfileChanged();
      }

      toast.success("Profile image uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Profile image upload failed.",
      );
    }
  }

  return (
    <Card className="border-border/70 bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <PersonAvatar
            firstName={firstName}
            imageUrl={imageUrl}
            lastName={lastName}
            size="lg"
          />
          <div className="min-w-0">
            <CardTitle>Profile Image</CardTitle>
            <CardDescription>
              Upload or replace the account photo used across your workspace
              identity.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MediaGallery
          canManage
          isPendingDelete={deleteMutation.isPending}
          isPendingSetPrimary={setPrimaryMutation.isPending}
          items={mediaItems}
          onDelete={(assignmentId) =>
            void deleteMutation.mutateAsync(assignmentId)
          }
          onSetPrimary={(assignmentId) =>
            void setPrimaryMutation.mutateAsync(assignmentId)
          }
        />
        {mediaItems.length === 1 && mediaItems[0]?.isPrimary ? (
          <p className="text-xs text-muted-foreground">
            This image is already your primary profile image.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <MediaUploader
              accept={ALLOWED_PROFILE_IMAGE_MIMES}
              canManage
              entitySlug="self"
              entityType="user"
              nextPosition={mediaItems.length}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: accountProfileMediaQueryKey,
                });
                void onProfileChanged();
              }}
              onUploadFile={handleUpload}
              uploadingLabel="Uploading..."
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP, GIF, or AVIF up to 10 MB.
        </p>
      </CardContent>
    </Card>
  );
}
