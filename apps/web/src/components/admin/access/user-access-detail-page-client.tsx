"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { PageShell } from "@/components/system/page-shell";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  adminUserAccessDetailQueryKey,
  fetchAdminUserAccessDetail,
} from "@/lib/react-query/admin-user-access";
import { UserAccessDetailBody } from "./user-access-detail-body";
import {
  UserAccessDetailSkeleton,
  UserAccessLoadError,
} from "./user-access-surfaces";

export function UserAccessDetailPageClient({ slug }: { slug: string }) {
  const { can } = useAuthorization();
  const detailQuery = useQuery({
    queryFn: () => fetchAdminUserAccessDetail(slug),
    queryKey: adminUserAccessDetailQueryKey(slug),
  });
  const canManageMedia = can("catalog.media.manage");

  return (
    <PageShell>
      {detailQuery.isPending && !detailQuery.data ? (
        <UserAccessDetailSkeleton />
      ) : detailQuery.isError ? (
        <UserAccessLoadError
          message={getAppErrorMessage(detailQuery.error)}
          title="Unable to load user access"
        />
      ) : detailQuery.data ? (
        <UserAccessDetailBody
          canManageMedia={canManageMedia}
          slug={slug}
          user={detailQuery.data}
        />
      ) : null}
    </PageShell>
  );
}
