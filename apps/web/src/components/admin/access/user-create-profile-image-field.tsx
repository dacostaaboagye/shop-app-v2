"use client";

import { ALLOWED_PROFILE_IMAGE_MIMES } from "@shop/contracts";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { getFormFieldMessages } from "@/lib/forms/field-errors";
import { validateProfileImageFile } from "@/lib/react-query/admin-user-profile-media";
import type { UserCreateField } from "./user-create-form.types";

export function UserCreateProfileImageField({
  disabled,
  field,
  showErrors,
}: {
  disabled: boolean;
  field: UserCreateField;
  showErrors: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const file =
    typeof File !== "undefined" && field.state.value instanceof File
      ? field.state.value
      : null;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  return (
    <Field
      className="gap-4"
      data-invalid={
        showErrors && field.state.meta.errors.length ? true : undefined
      }
    >
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={field.name}>Profile image</FieldLabel>
        <FieldDescription>
          Optional. Used in staff directories, assignments, and audit views.
        </FieldDescription>
      </div>

      <FieldContent className="gap-4">
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
          <ProfileImagePreview
            fileName={file?.name ?? null}
            previewUrl={previewUrl}
          />
          <div className="flex w-full flex-col items-center gap-1">
            <p className="max-w-full truncate text-sm font-medium text-foreground">
              {file?.name ?? "No image selected"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, GIF, or AVIF up to 10 MB.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              <UploadCloud data-icon="inline-start" />
              {file ? "Change image" : "Upload image"}
            </Button>
            {file ? (
              <Button
                disabled={disabled}
                onClick={() => {
                  field.handleChange(null);
                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X data-icon="inline-start" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <input
          accept={ALLOWED_PROFILE_IMAGE_MIMES.join(",")}
          className="sr-only"
          disabled={disabled}
          id={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => {
            const nextFile = event.target.files?.item(0) ?? null;
            field.handleChange(nextFile);
          }}
          ref={inputRef}
          type="file"
        />
        <FieldError
          errors={getFormFieldMessages(
            showErrors ? field.state.meta.errors : [],
          ).map((message) => ({ message }))}
        />
      </FieldContent>
    </Field>
  );
}

export function validateOptionalProfileImage(file: File | null) {
  return validateProfileImageFile(file);
}

function ProfileImagePreview({
  fileName,
  previewUrl,
}: {
  fileName: string | null;
  previewUrl: string | null;
}) {
  return (
    <div className="flex size-40 items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border shadow-sm">
      {previewUrl ? (
        // biome-ignore lint/performance/noImgElement: blob preview URLs are local client objects.
        <img
          alt={fileName ? `${fileName} preview` : "Profile image preview"}
          className="size-full object-cover"
          src={previewUrl}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImagePlus className="size-8" />
          <span className="text-xs font-medium">Optional photo</span>
        </div>
      )}
    </div>
  );
}
