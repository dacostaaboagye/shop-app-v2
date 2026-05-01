"use client";

import type { NotificationListResponse } from "@shop/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { openPlatformEventStream } from "@/lib/notifications/platform-event-stream";
import { notificationsQueryKeyPrefix } from "@/lib/react-query/notifications";
import { useAuthSessionStore } from "@/store/use-auth-session-store";
import {
  playNotificationChime,
  shouldPlayNotificationSound,
} from "./notification-live-provider.support";

const RECONNECT_DELAY_MS = 3_000;

// Safety-net poll cadence used when the SSE stream is unhealthy. The 3s
// reconnect handles transient drops; this kicks in for sustained failures
// (corporate proxies that strip SSE, network partition, server downtime)
// so the user still sees notifications, just at minute-scale freshness.
const FALLBACK_POLL_INTERVAL_MS = 60_000;

export function NotificationLiveProvider() {
  const queryClient = useQueryClient();
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isClosed = false;
    let cleanup = () => {};
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackPollTimer: ReturnType<typeof setInterval> | null = null;

    const startFallbackPoll = () => {
      if (fallbackPollTimer || isClosed) return;
      fallbackPollTimer = setInterval(() => {
        void queryClient.invalidateQueries({
          queryKey: notificationsQueryKeyPrefix,
        });
      }, FALLBACK_POLL_INTERVAL_MS);
    };

    const stopFallbackPoll = () => {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer);
        fallbackPollTimer = null;
      }
    };

    const connect = async () => {
      try {
        cleanup = await openPlatformEventStream({
          onOpen() {
            // Stream is live — drop the polling safety net.
            stopFallbackPoll();
          },
          onClose() {
            if (isClosed) return;
            // Stream just dropped. Start the fallback poll alongside the
            // reconnect attempt so the user keeps getting (slow) updates if
            // the stream stays down.
            startFallbackPoll();
            reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
          },
          onEvent(eventName) {
            if (eventName === "platform-event") {
              if (shouldPlayNotificationSound({ eventName, user })) {
                playNotificationChime();
              }

              // Optimistically bump unreadCount on every cached notifications
              // query so the bell badge reflects the new arrival immediately.
              // The list items themselves still come from the invalidate
              // refetch below — we don't synthesize a list entry from the
              // stream payload because a notificationKey is the projection
              // row id (per-user), not the platform event id.
              queryClient.setQueriesData<NotificationListResponse>(
                { queryKey: notificationsQueryKeyPrefix },
                (current) =>
                  current
                    ? { ...current, unreadCount: current.unreadCount + 1 }
                    : current,
              );

              void queryClient.invalidateQueries({
                queryKey: notificationsQueryKeyPrefix,
              });
            }
          },
        });
      } catch {
        if (isClosed) return;
        // Initial connection failed — go straight into fallback-poll mode
        // and keep retrying the stream.
        startFallbackPoll();
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    void connect();

    return () => {
      isClosed = true;
      cleanup();
      stopFallbackPoll();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [queryClient, status, user]);

  return null;
}
