"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  adminUserAccessDetailQueryKey,
  fetchAdminUserAccessDetail,
} from "@/lib/react-query/admin-user-access";
import { UserAccessDetailBody } from "./user-access-detail-body";

const USER_ACCESS_SKELETON_KEYS = [
  "user-access-stat-1",
  "user-access-stat-2",
  "user-access-stat-3",
  "user-access-stat-4",
] as const;

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
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {USER_ACCESS_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : detailQuery.isError ? (
        <AppErrorBanner
          detail={getAppErrorMessage(detailQuery.error)}
          error={detailQuery.error}
          onRetry={() => {
            void detailQuery.refetch();
          }}
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
