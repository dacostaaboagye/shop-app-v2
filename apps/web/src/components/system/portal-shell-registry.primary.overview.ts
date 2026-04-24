import {
  Bell,
  Building2,
  ClipboardList,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { toRoute } from "@/lib/routes";
import type { NavRegistryEntry } from "./portal-shell-config.types";

export const PRIMARY_OVERVIEW_NAV_REGISTRY: readonly NavRegistryEntry[] = [
  {
    activeMatchers: [{ mode: "exact", path: "/admin" }],
    description: "System overview and launch points for admin work.",
    href: toRoute("/admin"),
    icon: ShieldCheck,
    label: "Admin overview",
    requiredPermission: "admin.dashboard.view",
    section: "Overview",
  },
  {
    activeMatchers: [{ mode: "exact", path: "/manager" }],
    description: "Live summary for the assigned location.",
    href: toRoute("/manager"),
    icon: Building2,
    label: "Location overview",
    requiredPermission: "manager.dashboard.view",
    section: "Overview",
  },
  {
    activeMatchers: [{ mode: "exact", path: "/worker" }],
    description: "Assigned stock, tasks, and handover activity.",
    href: toRoute("/worker"),
    icon: ClipboardList,
    label: "My overview",
    requiredPermission: "worker.dashboard.view",
    section: "Overview",
  },
  {
    activeMatchers: [{ mode: "exact", path: "/supplier" }],
    description: "Purchase orders and fulfilment status.",
    href: toRoute("/supplier"),
    icon: ShoppingCart,
    label: "Supplier dashboard",
    requiredPermission: "supplier.dashboard.view",
    section: "Overview",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/supplier/notifications" }],
    description: "Operational updates relevant to your supplier account.",
    href: toRoute("/supplier/notifications"),
    icon: Bell,
    label: "Notifications",
    requiredPermission: "supplier.dashboard.view",
    section: "Overview",
    sidebar: false,
  },
  {
    activeMatchers: [{ mode: "exact", path: "/agent" }],
    description: "Deliveries assigned to you for today.",
    href: toRoute("/agent"),
    icon: Truck,
    label: "Delivery dashboard",
    requiredPermission: "agent.dashboard.view",
    section: "Overview",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/agent/notifications" }],
    description:
      "Operational updates relevant to your route and delivery work.",
    href: toRoute("/agent/notifications"),
    icon: Bell,
    label: "Notifications",
    requiredPermission: "agent.dashboard.view",
    section: "Overview",
    sidebar: false,
  },
];
