"use client";

import type {
  AdminPermissionSummary,
  AdminRoleSummary,
  AdminUserAccessDetail,
} from "@shop/contracts";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAccessManagePermissionsTab } from "./user-access-manage-permissions-tab";
import { UserAccessManageReasonDialog } from "./user-access-manage-reason-dialog";
import { UserAccessManageRolesTab } from "./user-access-manage-roles-tab";
import type { ReasonDialogState } from "./user-access-manage-support";

export function UserAccessManageBody({
  allPermissions,
  allRoles,
  canManage,
  slug,
  user,
}: {
  allPermissions: readonly AdminPermissionSummary[];
  allRoles: readonly AdminRoleSummary[];
  canManage: boolean;
  slug: string;
  user: AdminUserAccessDetail;
}) {
  const [dialog, setDialog] = useState<ReasonDialogState>({ kind: "closed" });

  return (
    <>
      <Tabs defaultValue="roles">
        <TabsList variant="line">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="roles">
          <UserAccessManageRolesTab
            allRoles={allRoles}
            canManage={canManage}
            onAssignRole={(roleSlug, roleName) =>
              setDialog({ kind: "assign-role", roleName, roleSlug })
            }
            onRevokeRole={(assignment) =>
              setDialog({ kind: "revoke-role", assignment })
            }
            roleAssignments={user.roleAssignments}
          />
        </TabsContent>
        <TabsContent className="pt-4" value="permissions">
          <UserAccessManagePermissionsTab
            allPermissions={allPermissions}
            canManage={canManage}
            effectivePermissions={user.effectivePermissions}
            onAllow={(permissionKey) =>
              setDialog({ kind: "allow-override", permissionKey })
            }
            onDeny={(permissionKey) =>
              setDialog({ kind: "deny-override", permissionKey })
            }
            onRemoveOverride={(override) =>
              setDialog({ kind: "remove-override", override })
            }
            userOverrides={user.userOverrides}
          />
        </TabsContent>
      </Tabs>

      <UserAccessManageReasonDialog
        onClose={() => setDialog({ kind: "closed" })}
        open={dialog.kind !== "closed"}
        slug={slug}
        state={dialog}
      />
    </>
  );
}
