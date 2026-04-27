"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PreviewImageProps = {
  alt: string;
  className?: string;
  dialogDescription?: string;
  fill?: boolean;
  height?: number;
  imageClassName?: string;
  previewTitle?: string;
  sizes?: string;
  src: string;
  width?: number;
};

export function PreviewImage({
  alt,
  className,
  dialogDescription,
  fill = false,
  height,
  imageClassName,
  previewTitle,
  sizes,
  src,
  width,
}: PreviewImageProps) {
  const title = previewTitle ?? alt;
  const triggerClassName = cn(
    "group relative overflow-hidden rounded-md bg-muted text-left ring-1 ring-border/60 transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    fill ? "size-full" : "inline-flex",
    className,
  );

  if (typeof window === "undefined") {
    return (
      <button
        className={triggerClassName}
        onClick={(event) => event.stopPropagation()}
        type="button"
      >
        {/* biome-ignore lint/performance/noImgElement: SSR-safe fallback for
        static markup tests and unconfigured remote preview hosts. */}
        <img
          alt={alt}
          className={cn(
            "object-cover transition-transform group-hover:scale-[1.03]",
            imageClassName,
          )}
          {...(fill
            ? { sizes: sizes ?? "160px" }
            : {
                height: height ?? 40,
                width: width ?? 40,
              })}
          src={src}
        />
      </button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            className={triggerClassName}
            onClick={(event) => event.stopPropagation()}
            type="button"
          />
        }
      >
        <Image
          alt={alt}
          className={cn(
            "object-cover transition-transform group-hover:scale-[1.03]",
            imageClassName,
          )}
          {...(fill
            ? { fill: true, sizes: sizes ?? "160px" }
            : {
                height: height ?? 40,
                width: width ?? 40,
              })}
          src={src}
          unoptimized
        />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden p-3 sm:max-w-4xl">
        <DialogHeader className="px-1">
          <DialogTitle>{title}</DialogTitle>
          {dialogDescription ? (
            <DialogDescription>{dialogDescription}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="relative flex max-h-[calc(100vh-8rem)] min-h-48 items-center justify-center overflow-hidden rounded-md bg-muted">
          <Image
            alt={alt}
            className="h-auto max-h-[calc(100vh-8rem)] w-auto object-contain"
            height={900}
            src={src}
            unoptimized
            width={1200}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImagePreviewPlaceholder({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60",
        className,
      )}
    >
      {children ?? <ImageOff className="size-4" />}
    </div>
  );
}
