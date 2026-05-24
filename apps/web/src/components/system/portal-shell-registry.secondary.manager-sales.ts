import { BarChart3, ClipboardList, FileText } from "lucide-react";
import { toRoute } from "@/lib/routes";
import type { NavRegistryEntry } from "./portal-shell-config.types";

export const SECONDARY_MANAGER_SALES_NAV_REGISTRY: readonly NavRegistryEntry[] =
  [
    {
      activeMatchers: [{ mode: "descendants", path: "/manager/sales" }],
      description: "All POS sales and invoices for this location.",
      href: toRoute("/manager/sales"),
      icon: BarChart3,
      label: "Sales",
      requiredPermission: "pos.sales.manage",
      section: "Operations",
    },
    {
      activeMatchers: [
        { mode: "descendants", path: "/manager/invoices/manual-requests" },
      ],
      description: "Request and track exceptional manual invoices.",
      href: toRoute("/manager/invoices/manual-requests"),
      icon: FileText,
      label: "Manual invoices",
      requiredPermission: "invoices.manual.view",
      section: "Operations",
    },
    {
      activeMatchers: [
        { mode: "exact", path: "/manager/invoices/manual-requests/new" },
      ],
      description: "Submit an exceptional manual invoice request.",
      href: toRoute("/manager/invoices/manual-requests/new"),
      icon: FileText,
      label: "New manual invoice request",
      requiredPermission: "invoices.manual.request",
      section: "Operations",
      sidebar: false,
    },
    {
      activeMatchers: [
        { mode: "descendants", path: "/manager/stock/supply-requests" },
      ],
      description: "Review and respond to worker stock restocking requests.",
      href: toRoute("/manager/stock/supply-requests"),
      icon: ClipboardList,
      label: "Supply requests",
      requiredPermission: "stock.supply.manage",
      section: "Operations",
    },
  ];
