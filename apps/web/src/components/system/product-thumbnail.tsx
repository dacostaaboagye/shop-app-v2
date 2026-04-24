"use client";

import { Package } from "lucide-react";
import { ImagePreviewPlaceholder, PreviewImage } from "./preview-image";

type ProductThumbnailProps = {
  className?: string;
  imageUrl?: string | null | undefined;
  productName: string;
  variantName?: string;
};

export function ProductThumbnail({
  className = "size-10",
  imageUrl,
  productName,
  variantName,
}: ProductThumbnailProps) {
  const label = variantName ? `${productName} - ${variantName}` : productName;

  if (imageUrl) {
    return (
      <PreviewImage
        alt={label}
        className={className}
        fill
        previewTitle={productName}
        {...(variantName ? { dialogDescription: variantName } : {})}
        src={imageUrl}
      />
    );
  }

  return (
    <ImagePreviewPlaceholder className={className}>
      <Package className="size-4" />
    </ImagePreviewPlaceholder>
  );
}
