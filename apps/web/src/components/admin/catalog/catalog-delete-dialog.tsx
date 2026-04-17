"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/react-query/query-client";

type CatalogDeleteDialogProps = {
  entityName: string;
  entitySlug: string;
  entityType: "brand" | "category" | "product";
  isOpen: boolean;
  onClose: () => void;
  onDelete: (slug: string) => Promise<unknown>;
  onSuccessQueryKeys: Array<readonly unknown[]>;
};

export function CatalogDeleteDialog({
  entityName,
  entitySlug,
  entityType,
  isOpen,
  onClose,
  onDelete,
  onSuccessQueryKeys,
}: CatalogDeleteDialogProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      return error.problem?.detail ?? error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "An unexpected error occurred.";
  };

  const mutation = useMutation({
    mutationFn: () => onDelete(entitySlug),
    onSuccess: () => {
      for (const key of onSuccessQueryKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      const labels: Record<string, string> = {
        brand: "Brand",
        category: "Category",
        product: "Product",
      };
      toast.success(`${labels[entityType]} deleted successfully.`);
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    mutation.mutate();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !isDeleting && !open && onClose()}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle>Confirm Deletion</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete the {entityType}{" "}
            <strong>"{entityName}"</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4" showCloseButton={false}>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Spinner className="mr-2" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            {isDeleting ? "Deleting..." : `Delete ${entityType}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
