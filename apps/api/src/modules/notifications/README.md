# Notifications Module

Owns:

- in-app notification records
- unread counts
- user activity feeds

Notification creation is triggered by domain events from other modules.

Current implementation:

- `platform_events` stores the durable operational event log
- `platform_event_audiences` stores the intended visibility rules
- `user_notifications` stores user-specific unread or read notification rows
- SSE is live delivery only; durable state is read from the database-backed
  event and notification tables
