export const moduleCatalog = [
  {
    key: "auth",
    description:
      "User identity, sessions, password flows, and self-service profile",
  },
  {
    key: "access-control",
    description: "Permissions, roles, overrides, and route authorization",
  },
  {
    key: "inventory-ownership",
    description: "Assignment, handover, attribution, and ownership history",
  },
  {
    key: "stock",
    description:
      "Balances, reservations, availability, and stock mutation integrity",
  },
  {
    key: "locations",
    description: "Stores, warehouses, zones, and physical scope",
  },
  {
    key: "catalog",
    description: "Products, categories, suppliers, media, and search",
  },
  {
    key: "deliveries",
    description: "Delivery creation, assignment, and state transitions",
  },
  {
    key: "notifications",
    description: "In-app notifications and activity feeds",
  },
] as const;
