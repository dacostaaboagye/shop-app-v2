import {
  ArrowLeftRight,
  Boxes,
  Package,
  Route as RouteIcon,
  UserCheck,
  Users,
} from "lucide-react";
import { toRoute } from "@/lib/routes";
import type { NavRegistryEntry, ShellMeta } from "./portal-shell-config.types";

export const SECONDARY_NAV_REGISTRY: readonly NavRegistryEntry[] = [
  {
    activeMatchers: [{ mode: "descendants", path: "/manager/stock" }],
    description: "Current stock levels and availability at this location.",
    href: toRoute("/manager/stock"),
    icon: Boxes,
    label: "Location stock",
    requiredPermission: "stock.view",
    section: "Operations",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/manager/transfers" }],
    description: "Inbound and outbound stock transfers for this location.",
    href: toRoute("/manager/transfers"),
    icon: ArrowLeftRight,
    label: "Transfers",
    requiredPermission: "transfers.view",
    section: "Operations",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/manager/staff" }],
    description: "Workers and managers assigned to this location.",
    href: toRoute("/manager/staff"),
    icon: Users,
    label: "Staff",
    requiredPermission: "staff.view",
    section: "People",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/worker/stock" }],
    description: "Stock items visible to you at your assigned location.",
    href: toRoute("/worker/stock"),
    icon: Boxes,
    label: "My stock",
    requiredPermission: "worker.stock.view",
    section: "My work",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/worker/transfers" }],
    description: "Transfer requests involving your assigned stock.",
    href: toRoute("/worker/transfers"),
    icon: ArrowLeftRight,
    label: "My transfers",
    requiredPermission: "worker.transfers.view",
    section: "My work",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/worker/assignments" }],
    description: "Stock items currently assigned to you.",
    href: toRoute("/worker/assignments"),
    icon: Package,
    label: "Assignments",
    requiredPermission: "worker.assignments.view",
    section: "My work",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/worker/handovers" }],
    description: "Handover records and ownership transfers.",
    href: toRoute("/worker/handovers"),
    icon: UserCheck,
    label: "Handovers",
    requiredPermission: "worker.handovers.view",
    section: "My work",
  },
  {
    activeMatchers: [{ mode: "descendants", path: "/agent/routes" }],
    description: "Your route map and stop sequence.",
    href: toRoute("/agent/routes"),
    icon: RouteIcon,
    label: "Routes",
    requiredPermission: "agent.routes.view",
    section: "Delivery",
  },
];

export const SHELL_META: ShellMeta = {
  emptyNotificationCopy:
    "Events, alerts, and updates relevant to your role will appear here.",
  heading: "Shop operations",
  notifications: [
    {
      body: "Managers and workers with invalid assignments will surface here once user management ships.",
      id: "admin-access-audit",
      timeLabel: "Queued for E-01-06",
      title: "Access review feed",
    },
    {
      body: "Low-stock and reservation pressure summaries will be grouped by location in the shared bell tray.",
      id: "admin-stock-watch",
      timeLabel: "Queued for E-01-09",
      title: "Operations watchlist",
    },
    {
      body: "Pending transfers, low-stock thresholds, and team activity will consolidate into this feed.",
      id: "manager-ops-feed",
      timeLabel: "Queued for E-02-02",
      title: "Location events",
    },
    {
      body: "Assignment changes and handover requests will feed into this tray once task workflows ship.",
      id: "worker-task-feed",
      timeLabel: "Queued for worker task backlog",
      title: "Task updates",
    },
  ],
};
