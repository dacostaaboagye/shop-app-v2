"use client";

import type { AdminSupplierSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import {
  AccessCountCell,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { PreviewImage } from "@/components/system/preview-image";
import { Badge } from "@/components/ui/badge";
import { formatAdminDate } from "@/lib/admin-models";

export const supplierColumns: ColumnDef<AdminSupplierSummary>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Supplier",
    cell: ({ row }) => {
      const supplier = row.original;

      return (
        <div className="flex items-center gap-3">
          {supplier.primaryImageUrl ? (
            <PreviewImage
              alt={`${supplier.name} logo`}
              className="size-10"
              height={40}
              previewTitle={supplier.name}
              src={supplier.primaryImageUrl}
              width={40}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
              <Building2 className="size-4" />
            </div>
          )}
          <AccessNameCell
            description={supplier.legalName ?? supplier.email}
            name={supplier.name}
            slug={supplier.slug}
          />
        </div>
      );
    },
  },
  {
    id: "primaryContact",
    enableSorting: false,
    header: "Primary contact",
    cell: ({ row }) => {
      const contact = row.original.primaryContact;

      return contact ? (
        <div className="min-w-0">
          <p className="text-balance text-sm font-medium text-foreground">
            {contact.firstName} {contact.lastName}
          </p>
          <p className="type-support mt-1 break-all text-muted-foreground">
            {contact.email ?? contact.phone ?? "No contact detail"}
          </p>
        </div>
      ) : (
        <AccessTextCell value="Not assigned" />
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "secondary" : "outline"}
      >
        {row.original.status === "active" ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "contacts",
    enableSorting: false,
    header: "Contacts",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <AccessCountCell value={row.original.contactCount} />
        <AccessTextCell
          value={
            row.original.linkedUserCount > 0
              ? `${row.original.linkedUserCount} portal user${row.original.linkedUserCount === 1 ? "" : "s"}`
              : "No linked users"
          }
        />
      </div>
    ),
  },
  {
    id: "paymentTermsDays",
    enableSorting: false,
    header: "Terms",
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {row.original.paymentTermsDays > 0
          ? `${row.original.paymentTermsDays} days`
          : "Due on receipt"}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
