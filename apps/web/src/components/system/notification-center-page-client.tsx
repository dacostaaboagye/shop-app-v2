"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  NotificationCenterHeader,
  NotificationCenterTabs,
  NotificationInboxSection,
} from "@/components/system/notification-center-page-client.sections";
import {
  buildNotificationEventOptions,
  buildNotificationResourceOptions,
  filterNotifications,
  hasActiveNotificationFilters,
  type NotificationFilters,
} from "@/components/system/notification-center-page-client.support";
import { PageShell } from "@/components/system/page-shell";
import {
  deleteNotification,
  fetchNotifications,
  notificationsQueryKey,
  notificationsQueryKeyPrefix,
  patchAllNotificationsRead,
  patchNotificationRead,
} from "@/lib/react-query/notifications";

type NotificationCenterPageClientProps = {
  description: string;
  headerActionsExtra?: ReactNode;
  secondaryTabContent?: ReactNode;
  secondaryTabLabel?: string;
  title: string;
};

const PAGE_LIMIT = 50;

export function NotificationCenterPageClient({
  description,
  headerActionsExtra,
  secondaryTabContent,
  secondaryTabLabel = "Sent",
  title,
}: NotificationCenterPageClientProps) {
  const [filters, setFilters] = useState<NotificationFilters>({
    dateRange: undefined,
    eventType: "",
    resourceKind: "",
    search: "",
    status: "all",
  });
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryFn: () => fetchNotifications(PAGE_LIMIT),
    queryKey: notificationsQueryKey(PAGE_LIMIT),
  });
  const markReadMutation = useMutation({
    mutationFn: patchNotificationRead,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });
  const markAllReadMutation = useMutation({
    mutationFn: patchAllNotificationsRead,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    async onSuccess() {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKeyPrefix,
      });
    },
  });

  const items = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const readCount = Math.max(items.length - unreadCount, 0);
  const eventOptions = useMemo(
    () => buildNotificationEventOptions(items),
    [items],
  );
  const resourceOptions = useMemo(
    () => buildNotificationResourceOptions(items),
    [items],
  );
  const hasActiveFilters = useMemo(
    () => hasActiveNotificationFilters(filters),
    [filters],
  );
  const filteredItems = useMemo(() => {
    return filterNotifications(items, filters);
  }, [filters, items]);

  const inboxContent = (
    <NotificationInboxSection
      deleteError={deleteMutation.error}
      deletePendingKey={deleteMutation.variables}
      error={notificationsQuery.error}
      eventOptions={eventOptions}
      filteredItems={filteredItems}
      filters={filters}
      hasActiveFilters={hasActiveFilters}
      isDeleting={deleteMutation.isError}
      isError={notificationsQuery.isError}
      isMarkAllReadError={markAllReadMutation.isError}
      isMarkReadError={markReadMutation.isError}
      isPending={notificationsQuery.isPending}
      itemsCount={items.length}
      markReadError={markReadMutation.error ?? markAllReadMutation.error}
      markReadPendingKey={markReadMutation.variables}
      onClearFilters={() =>
        setFilters({
          dateRange: undefined,
          eventType: "",
          resourceKind: "",
          search: "",
          status: "all",
        })
      }
      onDateRangeChange={(dateRange) =>
        setFilters((current) => ({ ...current, dateRange }))
      }
      onDelete={(key) => {
        void deleteMutation.mutateAsync(key);
      }}
      onEventTypeChange={(eventType) =>
        setFilters((current) => ({
          ...current,
          eventType: eventType === "__all__" ? "" : eventType,
        }))
      }
      onMarkRead={(key) => {
        void markReadMutation.mutateAsync(key);
      }}
      onResourceKindChange={(resourceKind) =>
        setFilters((current) => ({
          ...current,
          resourceKind: resourceKind === "__all__" ? "" : resourceKind,
        }))
      }
      onRetry={() => void notificationsQuery.refetch()}
      onSearchChange={(search) =>
        setFilters((current) => ({ ...current, search }))
      }
      onStatusChange={(status) =>
        setFilters((current) => ({ ...current, status }))
      }
      readCount={readCount}
      resourceOptions={resourceOptions}
      unreadCount={unreadCount}
    />
  );

  return (
    <PageShell>
      <NotificationCenterHeader
        description={description}
        headerActionsExtra={headerActionsExtra}
        isFetching={notificationsQuery.isFetching}
        isMarkingAllRead={markAllReadMutation.isPending}
        onMarkAllRead={() => void markAllReadMutation.mutateAsync()}
        onRefresh={() => void notificationsQuery.refetch()}
        title={title}
        unreadCount={unreadCount}
      />
      {secondaryTabContent ? (
        <NotificationCenterTabs
          inboxContent={inboxContent}
          secondaryTabContent={secondaryTabContent}
          secondaryTabLabel={secondaryTabLabel}
        />
      ) : (
        inboxContent
      )}
    </PageShell>
  );
}
