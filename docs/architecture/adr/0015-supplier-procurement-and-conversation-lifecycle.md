# ADR 0015: Supplier Procurement, Offers, And Conversations

## Status

Accepted for phased implementation.

## Context

The supplier area started as a user-role concern, but production procurement
needs a supplier organization model with contacts, portal access, conversations,
reusable supplier offers, quote requests, purchase orders, and auditable price
changes.

The system must support goods already in the catalog and goods that are not yet
cataloged. It must also support both sides initiating communication: the
business can ask suppliers to source goods, and suppliers can propose new goods
or ask whether the business is interested.

## Decision

Supplier procurement will be modeled as connected but separate lifecycles.

- A supplier is an organization, not a login user.
- A supplier contact is a person or desk under a supplier.
- A supplier contact may be linked to one portal user account.
- Supplier portal access is scoped to the linked supplier contact and supplier.
- Conversations are first-class two-way threads, not response fields.
- Supplier offers store reusable pricing and supply terms for supplied SKUs.
- Supplier offers are separate from internal cost prices.
- Quote requests snapshot supplier-submitted terms at submission time.
- Accepted quotes snapshot into purchase orders.
- Purchase orders and accepted quote values are immutable commercial evidence.
- Supplier price changes create admin review work before internal cost changes.
- Important supplier events publish platform events for notifications and audit.

## Supplier Contact And Portal Access

Supplier contacts can exist without portal access. Portal access is granted by:

- linking a contact to an existing user account
- inviting a new supplier portal user for that contact

The API boundary enforces supplier scoping. A supplier contact user cannot read
or mutate another supplier's records. A supplier contact can have narrower
permissions such as messaging, quote submission, pricing, or finance.

## Conversations

Supplier communication is represented by `supplier_threads` and
`supplier_thread_messages`.

Thread types:

- `general`
- `sourcing_inquiry`
- `supplier_product_proposal`
- `quote_request`
- `purchase_order`
- `price_change`

Thread statuses:

- `open`
- `waiting_on_admin`
- `waiting_on_supplier`
- `resolved`
- `archived`

Messages support:

- text body
- image and PDF attachments through the existing media upload system
- edit history
- soft deletion where allowed
- system messages for lifecycle events
- unread counts

The initial sync model will use React Query polling with optimistic send. The
backend will publish platform events so the same model can move to SSE later.

## Product Proposals

Suppliers may start product proposal threads for goods not yet in the catalog.

Product proposals can include:

- product name
- description
- proposed brand and category when known
- images or specification documents
- suggested price range
- minimum order quantity
- lead time
- availability notes

Admins can reply, request more detail, create a draft catalog product, request a
quote, reject, or archive the proposal.

## Supplier Offers

A supplier offer is reusable commercial data for a supplier and SKU. It reduces
quote-form burden by letting suppliers reuse values.

Offer fields include:

- supplier product code
- default unit price
- currency
- minimum order quantity
- pack size
- lead time days
- available quantity or typical capacity
- price valid until
- tax, delivery, and return terms
- notes and specification attachments
- status: `draft`, `active`, `archived`

Offer revisions are append-only. They record old values, new values, actor,
timestamp, and source such as supplier edit, admin edit, accepted quote, or
imported quote.

## Quote Requests

Admin quote requests can target catalog SKUs or external goods. Admin supplies
requested quantities, needed date, destination, notes, and attachments. The
supplier supplies price and commercial terms.

Quote line prefill priority:

1. active supplier offer
2. previous accepted quote for the same supplier and SKU
3. previous submitted quote for the same supplier and SKU
4. blank line

A supplier must still submit the quote, even when the quote is prefilled.

Quote statuses:

- `draft`
- `sent`
- `supplier_viewed`
- `quoted`
- `revision_requested`
- `revised`
- `accepted`
- `rejected`
- `expired`
- `cancelled`

## Price Ownership

The supplier owns supplier prices. The business owns internal cost prices.

Supplier quote prices and supplier offer prices never automatically update
internal SKU cost prices. A supplier price change creates a review item and a
notification for admins. Applying a supplier price to internal cost price is a
separate audited admin action.

## Purchase Orders

Purchase orders are created from accepted quotes. They lock accepted quote
values, including price, currency, terms, attachments, destination, and line
quantities.

Purchase order statuses:

- `draft`
- `issued`
- `acknowledged`
- `partially_received`
- `received`
- `cancelled`
- `closed`

Goods receipt must be idempotent and must update stock only once per receipt
event.

## Email And Notifications

Email delivery is supporting infrastructure, not the source of truth. All
supplier events must also create in-app notifications.

Email is used for:

- supplier portal invitations
- verification and password reset
- quote request alerts
- quote accepted or rejected notices
- purchase order issued notices
- urgent admin supplier notifications

Email delivery must expose provider configuration errors, structured failures,
retry or resend paths, and send history for support.

## Consequences

- Existing `supplier_response`-style fields become transitional.
- Existing supplier inquiries should migrate to thread-backed conversations.
- Supplier price changes need append-only history.
- Accepted quotes and purchase orders must preserve snapshots.
- Supplier portal implementation must be scoped at the API boundary, not only by
  UI navigation.
- The first implementation slices should prioritize portal access, reliable
  email/in-app notification, and conversations before quote and PO automation.
