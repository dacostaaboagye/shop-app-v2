"use client";

import type { AdminCategorySummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAdminCategory } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import {
  CatalogDateCell,
  CatalogImageCell,
  CatalogNameCell,
  CatalogStatusCell,
  CatalogTextCell,
} from "../catalog-table-cells";

export const categoryTableColumns: Array<
  ColumnDef<AdminCategorySummary, unknown>
> = [
  {
    id: "image",
    header: "",
    size: 56,
    cell: ({ row }) => (
      <CatalogImageCell
        imageUrl={row.original.primaryImageUrl}
        title={row.original.name}
      />
    ),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <CatalogNameCell name={row.original.name} slug={row.original.slug} />
    ),
  },
  {
    accessorKey: "parentCategorySlug",
    enableSorting: false,
    header: "Parent",
    id: "parentCategorySlug",
    cell: ({ row }) => (
      <CatalogTextCell
        tone="identifier"
        value={row.original.parentCategorySlug}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    id: "status",
    cell: ({ row }) => <CatalogStatusCell status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    id: "createdAt",
    cell: ({ row }) => <CatalogDateCell value={row.original.createdAt} />,
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
        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
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
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="destructive"
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
        onSuccessQueryKeys={[["admin", "catalog", "categories"]]}
      />
    </>
  );
}
