"use client";

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

    const connect = async () => {
      try {
        cleanup = await openPlatformEventStream({
          onClose() {
            if (!isClosed) {
              reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
            }
          },
          onEvent(eventName) {
            if (eventName === "platform-event") {
              if (shouldPlayNotificationSound({ eventName, user })) {
                playNotificationChime();
              }
              void queryClient.invalidateQueries({
                queryKey: notificationsQueryKeyPrefix,
              });
            }
          },
        });
      } catch {
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      }
    };

    void connect();

    return () => {
      isClosed = true;
      cleanup();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [queryClient, status, user]);

  return null;
}
