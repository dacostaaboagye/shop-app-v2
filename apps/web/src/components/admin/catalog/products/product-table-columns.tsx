"use client";

import type { AdminProductSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageOff, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";
import { deleteAdminProduct } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";

export const productTableColumns: Array<
  ColumnDef<AdminProductSummary, unknown>
> = [
  {
    id: "image",
    header: "",
    size: 56,
    cell: ({ row }) =>
      row.original.primaryImageUrl ? (
        <Image
          alt={row.original.name}
          className="rounded object-cover"
          height={40}
          src={row.original.primaryImageUrl}
          unoptimized
          width={40}
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded bg-muted">
          <ImageOff className="size-4 text-muted-foreground" />
        </div>
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
    accessorKey: "brandSlug",
    enableSorting: false,
    header: "Brand",
    id: "brandSlug",
    cell: ({ row }) =>
      row.original.brandSlug ? (
        <span className="text-sm text-muted-foreground">
          {row.original.brandSlug}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "categorySlug",
    enableSorting: false,
    header: "Category",
    id: "categorySlug",
    cell: ({ row }) =>
      row.original.categorySlug ? (
        <span className="text-sm text-muted-foreground">
          {row.original.categorySlug}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "variantCount",
    enableSorting: false,
    header: "Variants",
    id: "variantCount",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.variantCount}</span>
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
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];

function ProductActions({ product }: { product: AdminProductSummary }) {
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
                href={toRoute(`/admin/products/${product.slug}?edit=true`)}
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
