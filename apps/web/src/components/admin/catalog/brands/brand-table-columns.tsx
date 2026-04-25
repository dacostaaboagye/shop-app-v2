"use client";

import type { AdminBrandSummary } from "@shop/contracts";
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
import { deleteAdminBrand } from "@/lib/react-query/admin-catalog";
import { toRoute } from "@/lib/routes";
import { CatalogDeleteDialog } from "../catalog-delete-dialog";
import {
  CatalogDateCell,
  CatalogImageCell,
  CatalogNameCell,
  CatalogStatusCell,
  CatalogTextCell,
} from "../catalog-table-cells";

export const brandTableColumns: Array<ColumnDef<AdminBrandSummary, unknown>> = [
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
    accessorKey: "website",
    enableSorting: false,
    header: "Website",
    id: "website",
    cell: ({ row }) => <CatalogTextCell value={row.original.website} />,
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
    cell: ({ row }) => <BrandActions brand={row.original} />,
  },
];

function BrandActions({ brand }: { brand: AdminBrandSummary }) {
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
                href={toRoute(`/admin/products/brands/${brand.slug}?edit=true`)}
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
        entityName={brand.name}
        entitySlug={brand.slug}
        entityType="brand"
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={deleteAdminBrand}
        onSuccessQueryKeys={[["admin", "catalog", "brands"]]}
      />
    </>
  );
}
