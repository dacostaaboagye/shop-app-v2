export type PlatformEventAudience =
  | { kind: "user"; userId: string }
  | {
      kind: "permission";
      locationId?: string;
      permission: string;
    };

export type PlatformEventResource = {
  kind: string;
  reference: string;
};

export type PlatformEventRecord = {
  actor: {
    userSlug: string;
  };
  audience: PlatformEventAudience[];
  id: string;
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
  resource: PlatformEventResource;
  summary: string;
  type: string;
};

export type PlatformEventStreamMessage = Omit<PlatformEventRecord, "audience">;

export interface PlatformEventPublisher {
  publish(event: PlatformEventRecord): Promise<void>;
}

export interface PlatformEventSubscriber {
  subscribe(
    listener: (event: PlatformEventRecord) => void | Promise<void>,
  ): () => void;
}

export interface PlatformEventBus
  extends PlatformEventPublisher,
    PlatformEventSubscriber {}

export function toPlatformEventStreamMessage(
  event: PlatformEventRecord,
): PlatformEventStreamMessage {
  return {
    actor: event.actor,
    id: event.id,
    occurredAt: event.occurredAt,
    payload: event.payload,
    resource: event.resource,
    summary: event.summary,
    type: event.type,
  };
}
