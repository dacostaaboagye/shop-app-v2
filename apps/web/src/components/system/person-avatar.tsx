"use client";

import { PreviewImage } from "@/components/system/preview-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type PersonAvatarProps = {
  className?: string;
  firstName?: string | null | undefined;
  imageUrl?: string | null | undefined;
  interactive?: boolean;
  lastName?: string | null | undefined;
  name?: string | null | undefined;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS_NAMES = {
  lg: "size-12",
  md: "size-10",
  sm: "size-8",
} as const;

const FALLBACK_TEXT_CLASS_NAMES = {
  lg: "text-sm",
  md: "text-sm",
  sm: "text-xs",
} as const;

export function PersonAvatar({
  className,
  firstName,
  imageUrl,
  interactive = true,
  lastName,
  name,
  size = "md",
}: PersonAvatarProps) {
  const displayName =
    name ?? [firstName, lastName].filter(Boolean).join(" ").trim();
  const alt = displayName ? `${displayName} profile image` : "Profile image";
  const src = imageUrl?.trim();

  if (src && interactive) {
    return (
      <PreviewImage
        alt={alt}
        className={cn(SIZE_CLASS_NAMES[size], "rounded-full", className)}
        height={size === "lg" ? 48 : size === "md" ? 40 : 32}
        imageClassName="rounded-full"
        previewTitle={displayName || "Profile image"}
        src={src}
        width={size === "lg" ? 48 : size === "md" ? 40 : 32}
      />
    );
  }

  if (src) {
    return (
      <span
        data-slot="avatar"
        data-size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
        className={cn(
          "group/avatar relative flex shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
          SIZE_CLASS_NAMES[size],
          className,
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: SSR-safe non-interactive
        avatar path used by server-rendered tests and shared shell markup. */}
        <img
          alt={alt}
          className="aspect-square size-full rounded-full object-cover"
          data-slot="avatar-image"
          src={src}
          {...(size === "lg"
            ? { height: 48, width: 48 }
            : size === "md"
              ? { height: 40, width: 40 }
              : { height: 32, width: 32 })}
        />
      </span>
    );
  }

  return (
    <Avatar
      className={cn(SIZE_CLASS_NAMES[size], className)}
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
    >
      <AvatarFallback className={FALLBACK_TEXT_CLASS_NAMES[size]}>
        {getInitials({ firstName, lastName, name: displayName })}
      </AvatarFallback>
    </Avatar>
  );
}

function getInitials(input: {
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  name?: string | null | undefined;
}) {
  const fromNames = [input.firstName, input.lastName]
    .flatMap((part) => part?.trim().charAt(0) || [])
    .join("");

  if (fromNames) return fromNames.toUpperCase();

  const words = input.name?.trim().split(/\s+/).slice(0, 2) ?? [];
  const initials = words.map((word) => word.charAt(0)).join("");

  return initials ? initials.toUpperCase() : "U";
}
