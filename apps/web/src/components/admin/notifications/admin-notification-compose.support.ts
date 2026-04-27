export const ADMIN_NOTIFICATION_AUDIENCE_OPTIONS = [
  {
    description: "Admins with global portal access.",
    label: "Admins",
    permission: "admin.dashboard.view",
  },
  {
    description: "Managers assigned to the selected location scope.",
    label: "Managers",
    permission: "manager.dashboard.view",
  },
  {
    description: "Workers assigned to the selected location scope.",
    label: "Workers",
    permission: "worker.dashboard.view",
  },
  {
    description: "Sales operators at the selected location scope.",
    label: "Sales Operators",
    permission: "pos.sales.process",
  },
  {
    description: "Supply managers for the selected location scope.",
    label: "Supply Managers",
    permission: "stock.supply.manage",
  },
  {
    description: "Workers and managers who can raise supply requests.",
    label: "Supply Requesters",
    permission: "stock.supply.request",
  },
] as const;

export const ADMIN_NOTIFICATION_TARGET_OPTIONS = [
  {
    description:
      "Send to a permission-based audience, optionally scoped to one location.",
    label: "Audience",
    value: "audience",
  },
  {
    description: "Send directly to one manager or worker.",
    label: "Specific Staff Member",
    value: "user",
  },
] as const;
