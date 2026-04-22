import type { PoolClient } from "pg";

type SystemPermission = {
  description: string;
  key: string;
};

type SystemRole = {
  description: string;
  name: string;
  permissions: readonly string[];
  slug: string;
};

const SYSTEM_PERMISSIONS: readonly SystemPermission[] = [
  {
    key: "admin.dashboard.view",
    description: "View the admin portal landing page.",
  },
  {
    key: "manager.dashboard.view",
    description: "View the manager portal landing page.",
  },
  {
    key: "worker.dashboard.view",
    description: "View the worker portal landing page.",
  },
  {
    key: "supplier.dashboard.view",
    description: "View the supplier portal landing page.",
  },
  {
    key: "agent.dashboard.view",
    description: "View the agent portal landing page.",
  },
  {
    key: "users.view",
    description: "View the admin user management surface.",
  },
  {
    key: "locations.view",
    description: "View the admin location management surface.",
  },
  {
    key: "locations.create",
    description: "Create stores and warehouses from the admin portal.",
  },
  {
    key: "access.roles.view",
    description: "View roles configured for access control.",
  },
  {
    key: "access.roles.manage",
    description: "Create and update roles and their granted permissions.",
  },
  {
    key: "access.permissions.view",
    description: "View the permission catalogue and role coverage.",
  },
  {
    key: "access.audit.view",
    description: "View access-control audit history.",
  },
  {
    key: "access.assignments.manage",
    description: "Assign roles and permission overrides to users.",
  },
  {
    key: "access.users.view",
    description:
      "View user access details, role coverage, and location scopes.",
  },
  {
    key: "catalog.view",
    description: "View the admin catalogue management surface.",
  },
  {
    key: "catalog.brands.manage",
    description: "Create and update catalog brands.",
  },
  {
    key: "catalog.categories.manage",
    description: "Create and update product categories.",
  },
  {
    key: "catalog.cost_price.view",
    description: "View cost price on catalog variants.",
  },
  {
    key: "catalog.products.manage",
    description: "Create, update, and archive catalog products and variants.",
  },
  {
    key: "catalog.media.manage",
    description: "Upload, reorder, and delete media for catalog entities.",
  },
  {
    key: "inventory.read",
    description: "Read inventory and reservation administrative data.",
  },
  {
    key: "inventory.write",
    description: "Record stock counts and manual inventory adjustments.",
  },
  {
    key: "orders.view",
    description: "View the admin order management surface.",
  },
  {
    key: "deliveries.view",
    description: "View the admin delivery management surface.",
  },
  {
    key: "suppliers.view",
    description: "View the admin supplier management surface.",
  },
  {
    key: "suppliers.manage",
    description: "Create and update supplier organizations and relationships.",
  },
  {
    key: "settings.documents.view",
    description: "View official document, brand, and money settings.",
  },
  {
    key: "settings.documents.manage",
    description: "Manage official document, brand, and money settings.",
  },
  {
    key: "settings.location_documents.manage",
    description: "Manage allowed document overrides for assigned locations.",
  },
  {
    key: "stock.view",
    description: "View location stock levels and availability.",
  },
  {
    key: "transfers.view",
    description: "View stock transfer records for a location.",
  },
  {
    key: "staff.view",
    description: "View staff assignments for a location.",
  },
  {
    key: "worker.assignments.view",
    description: "View assigned stock tasks for the current worker.",
  },
  {
    key: "worker.handovers.view",
    description: "View handover records for the current worker.",
  },
  {
    key: "supplier.catalog.view",
    description: "View the supplier's product catalogue.",
  },
  {
    key: "agent.routes.view",
    description: "View assigned delivery routes for the current agent.",
  },
  {
    key: "worker.stock.view",
    description: "View stock items visible at the worker's assigned location.",
  },
  {
    key: "worker.transfers.view",
    description:
      "View transfer requests involving the worker's assigned stock.",
  },
  {
    key: "pos.sales.process",
    description: "Process a POS sale and generate an invoice.",
  },
  {
    key: "pos.sales.view",
    description: "View own POS sales history and invoices.",
  },
  {
    key: "pos.sales.manage",
    description: "View all POS sales and invoices for a managed location.",
  },
  {
    key: "stock.assignments.manage",
    description: "Assign and reassign product variants to workers.",
  },
  {
    key: "stock.assignments.view",
    description: "View all current stock assignments at a location.",
  },
  {
    key: "stock.assignments.own.view",
    description: "View own assigned product variants.",
  },
  {
    key: "stock.handovers.manage",
    description: "Initiate and end stock ownership handovers.",
  },
  {
    key: "stock.supply.request",
    description: "Create and cancel stock supply requests.",
  },
  {
    key: "stock.supply.manage",
    description: "View, approve, and reject stock supply requests for a location.",
  },
] as const;

export const SYSTEM_ROLES: readonly SystemRole[] = [
  {
    slug: "basic_user",
    name: "Basic User",
    description: "Default authenticated user with no staff portal access.",
    permissions: [],
  },
  {
    slug: "admin",
    name: "Admin",
    description: "System administrator with current admin view permissions.",
    permissions: [
      "admin.dashboard.view",
      "users.view",
      "locations.view",
      "locations.create",
      "access.roles.view",
      "access.roles.manage",
      "access.permissions.view",
      "access.audit.view",
      "access.assignments.manage",
      "access.users.view",
      "catalog.view",
      "catalog.brands.manage",
      "catalog.categories.manage",
      "catalog.cost_price.view",
      "catalog.products.manage",
      "catalog.media.manage",
      "inventory.read",
      "inventory.write",
      "orders.view",
      "deliveries.view",
      "suppliers.view",
      "suppliers.manage",
      "settings.documents.view",
      "settings.documents.manage",
      "settings.location_documents.manage",
      "stock.view",
      "transfers.view",
      "staff.view",
      "settings.location_documents.manage",
      "worker.assignments.view",
      "worker.handovers.view",
      "worker.stock.view",
      "worker.transfers.view",
      "pos.sales.process",
      "pos.sales.view",
      "pos.sales.manage",
      "stock.assignments.manage",
      "stock.assignments.view",
      "stock.assignments.own.view",
      "stock.handovers.manage",
      "stock.supply.request",
      "stock.supply.manage",
    ],
  },
  {
    slug: "manager",
    name: "Manager",
    description: "Location manager with manager portal access.",
    permissions: [
      "manager.dashboard.view",
      "inventory.read",
      "inventory.write",
      "stock.view",
      "transfers.view",
      "staff.view",
      "worker.assignments.view",
      "worker.handovers.view",
      "worker.stock.view",
      "worker.transfers.view",
      "pos.sales.process",
      "pos.sales.view",
      "pos.sales.manage",
      "stock.assignments.manage",
      "stock.assignments.view",
      "stock.assignments.own.view",
      "stock.handovers.manage",
      "stock.supply.request",
      "stock.supply.manage",
    ],
  },
  {
    slug: "worker",
    name: "Worker",
    description: "Worker with task-focused portal access.",
    permissions: [
      "worker.dashboard.view",
      "worker.assignments.view",
      "worker.handovers.view",
      "worker.stock.view",
      "worker.transfers.view",
      "pos.sales.process",
      "pos.sales.view",
      "stock.assignments.own.view",
      "stock.handovers.manage",
      "stock.supply.request",
    ],
  },
  {
    slug: "supplier",
    name: "Supplier",
    description: "Supplier with supplier portal access.",
    permissions: ["supplier.dashboard.view", "supplier.catalog.view"],
  },
  {
    slug: "agent",
    name: "Agent",
    description: "Delivery agent with delivery portal access.",
    permissions: ["agent.dashboard.view", "agent.routes.view"],
  },
] as const;

export async function seedAccessControlCatalog(
  client: PoolClient,
  now: Date,
): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permission of SYSTEM_PERMISSIONS) {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO permissions (key, description)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE
          SET description = EXCLUDED.description
        RETURNING id
      `,
      [permission.key, permission.description],
    );

    const permissionId = result.rows[0]?.id;

    if (!permissionId) {
      throw new Error(`Unable to resolve permission ${permission.key}.`);
    }

    permissionIds.set(permission.key, permissionId);
  }

  const roleIds = new Map<string, string>();

  for (const role of SYSTEM_ROLES) {
    const roleResult = await client.query<{ id: string }>(
      `
        INSERT INTO roles (slug, name, description, is_system, created_at)
        VALUES ($1, $2, $3, true, $4)
        ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_system = EXCLUDED.is_system
        RETURNING id
      `,
      [role.slug, role.name, role.description, now],
    );

    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error(`Unable to resolve role ${role.slug}.`);
    }

    roleIds.set(role.slug, roleId);

    for (const permissionKey of role.permissions) {
      const permissionId = permissionIds.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Missing seeded permission ${permissionKey}.`);
      }

      await client.query(
        `
          INSERT INTO role_permissions (role_id, permission_id, granted_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `,
        [roleId, permissionId, now],
      );
    }
  }

  return roleIds;
}

export async function ensureActiveUserRoleAssignment(input: {
  assignedAt: Date;
  client: PoolClient;
  roleId: string;
  userId: string;
}): Promise<void> {
  const existingAssignment = await input.client.query<{ id: string }>(
    `
      SELECT id
      FROM user_roles
      WHERE user_id = $1 AND role_id = $2 AND revoked_at IS NULL
      LIMIT 1
    `,
    [input.userId, input.roleId],
  );

  if (existingAssignment.rows.length > 0) {
    return;
  }

  await input.client.query(
    `
      INSERT INTO user_roles (user_id, role_id, assigned_at)
      VALUES ($1, $2, $3)
    `,
    [input.userId, input.roleId, input.assignedAt],
  );
}
