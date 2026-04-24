"use client";

import type { AdminCategorySummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  ImagePreviewPlaceholder,
  PreviewImage,
} from "@/components/system/preview-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import { deleteAdminCategory } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";

export const categoryTableColumns: Array<
  ColumnDef<AdminCategorySummary, unknown>
> = [
  {
    id: "image",
    header: "",
    size: 56,
    cell: ({ row }) =>
      row.original.primaryImageUrl ? (
        <PreviewImage
          alt={row.original.name}
          className="size-10"
          height={40}
          imageClassName="rounded-md"
          previewTitle={row.original.name}
          src={row.original.primaryImageUrl}
          width={40}
        />
      ) : (
        <ImagePreviewPlaceholder className="size-10" />
      ),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium leading-none">{row.original.name}</p>
        <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground">
          {row.original.slug}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "parentCategorySlug",
    enableSorting: false,
    header: "Parent",
    id: "parentCategorySlug",
    cell: ({ row }) =>
      row.original.parentCategorySlug ? (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.parentCategorySlug}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    id: "status",
    cell: ({ row }) => {
      const meta = CATALOG_STATUS_META[row.original.status];

      return (
        <Badge className={meta.className} variant="outline">
          {meta.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    id: "createdAt",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "actions",
    size: 48,
    cell: ({ row }) => <CategoryActions category={row.original} />,
  },
];

function CategoryActions({ category }: { category: AdminCategorySummary }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVertical className="size-4" />
          <span className="sr-only">Open menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <Link
                href={toRoute(
                  `/admin/products/categories/${category.slug}?edit=true`,
                )}
              />
            }
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteDialog
        entityName={category.name}
        entitySlug={category.slug}
        entityType="category"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={deleteAdminCategory}
        onSuccessQueryKeys={[
          // Invalidate all variations of category queries
          ["admin", "catalog", "categories"],
        ]}
      />
    </>
  );
}
