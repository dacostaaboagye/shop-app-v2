import type { AdminMediaRecord } from "@shop/contracts";
import { FileText, Star, Trash2 } from "lucide-react";
import { PreviewImage } from "@/components/system/preview-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  canManage: boolean;
  isPendingDelete: boolean;
  isPendingSetPrimary: boolean;
  items: AdminMediaRecord[];
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
};

export function MediaGallery({
  canManage,
  isPendingDelete,
  isPendingSetPrimary,
  items,
  onDelete,
  onSetPrimary,
}: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No media yet. Upload an image or video below.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <div className="flex flex-col gap-1" key={item.assignmentId}>
          <div className="relative aspect-square overflow-hidden rounded-md border border-border/60 bg-muted">
            {item.mediaType === "image" ? (
              <PreviewImage
                alt={item.altText ?? item.entitySlug}
                fill
                imageClassName="rounded-md"
                previewTitle={item.altText ?? item.entitySlug}
                sizes="(min-width: 768px) 25vw, 50vw"
                src={item.publicUrl}
              />
            ) : item.mediaType === "video" ? (
              <video
                className="size-full object-cover"
                muted
                src={item.publicUrl}
              />
            ) : (
              <a
                className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center text-sm"
                href={item.publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                <FileText />
                <span className="line-clamp-2">
                  {item.altText ?? "Document"}
                </span>
              </a>
            )}
            {item.isPrimary ? (
              <Badge
                className="absolute left-1 top-1 px-1 py-0 text-[0.6rem]"
                variant="default"
              >
                Primary
              </Badge>
            ) : null}
          </div>
          {canManage ? (
            <div className="flex gap-1">
              {!item.isPrimary ? (
                <Button
                  className="h-6 flex-1 px-2 text-xs"
                  disabled={isPendingSetPrimary}
                  onClick={() => onSetPrimary(item.assignmentId)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Star className="size-3" />
                  Primary
                </Button>
              ) : null}
              <Button
                className="h-6 px-2"
                disabled={isPendingDelete}
                onClick={() => onDelete(item.assignmentId)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3 text-destructive" />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
