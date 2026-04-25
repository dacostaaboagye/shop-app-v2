"use client";

import type { AdminProductSummary } from "@shop/contracts";
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
import { deleteAdminProduct } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import {
  CatalogCountCell,
  CatalogDateCell,
  CatalogImageCell,
  CatalogNameCell,
  CatalogStatusCell,
  CatalogTextCell,
} from "../catalog-table-cells";

export const productTableColumns: Array<
  ColumnDef<AdminProductSummary, unknown>
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
    accessorKey: "brandSlug",
    enableSorting: false,
    header: "Brand",
    id: "brandSlug",
    cell: ({ row }) => <CatalogTextCell value={row.original.brandSlug} />,
  },
  {
    accessorKey: "categorySlug",
    enableSorting: false,
    header: "Category",
    id: "categorySlug",
    cell: ({ row }) => <CatalogTextCell value={row.original.categorySlug} />,
  },
  {
    accessorKey: "variantCount",
    enableSorting: false,
    header: "Variants",
    id: "variantCount",
    cell: ({ row }) => <CatalogCountCell value={row.original.variantCount} />,
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
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];

function ProductActions({ product }: { product: AdminProductSummary }) {
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
                href={toRoute(`/admin/products/${product.slug}?edit=true`)}
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
        entityName={product.name}
        entitySlug={product.slug}
        entityType="product"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={deleteAdminProduct}
        onSuccessQueryKeys={[
          ["admin", "catalog", "products"],
          ["admin", "catalog", "counts"],
        ]}
      />
    </>
  );
}
