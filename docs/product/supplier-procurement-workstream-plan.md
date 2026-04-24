# Supplier Procurement Workstream Plan

Backlog ticket: `E-03-05`

This workstream upgrades supplier management from profile CRUD into a
production procurement lifecycle. It covers supplier portal access, two-way
communication, product proposals, reusable supplier offers, quote requests,
purchase orders, supplier price reviews, notifications, and email reliability.

Related architecture:

- [ADR 0015](../architecture/adr/0015-supplier-procurement-and-conversation-lifecycle.md)
- [ADR 0012](../architecture/adr/0012-platform-event-backbone.md)
- [ADR 0013](../architecture/adr/0013-platform-event-delivery-uses-a-durable-outbox-loop.md)
- [ADR 0002](../architecture/adr/0002-public-identifiers.md)
- [ADR 0003](../architecture/adr/0003-append-only-ledgers.md)

## Product Principles

- A supplier is an organization, not a user.
- Supplier contacts are people or desks under a supplier.
- Portal users are linked to contacts and scoped to one supplier.
- Supplier and admin communication is two-way.
- Supplier prices belong to suppliers.
- Internal cost prices belong to the business.
- Quotes and purchase orders must snapshot commercial terms.
- Users should not re-enter the same quote and pricing data repeatedly.
- Email is useful, but in-app records and notifications are the source of truth.

## Execution Slices

### `E-03-05A` supplier contact portal access

Status:
- started
- implemented so far: admin can link an existing user account to a supplier
  contact, invite a contact by email, unlink the portal user, supplier role
  assignment is written through the access-control service path, supplier portal
  reads ignore inactive contacts and inactive suppliers, inactive contacts
  cannot be linked or invited, and the supplier contact UI exposes link,
  invite, resend invite, unlink, and explicit portal status states
- remaining before complete: configurable invite template preview,
  cross-supplier denial tests with persistence-level coverage, and
  human-readable notifications

Goal:
- let admins link or invite supplier portal accounts for supplier contacts

Acceptance criteria:

- admin can link a supplier contact to an existing user account
- admin can invite a new supplier portal user for a contact
- supplier contacts show portal status: none, invited, linked, inactive
- supplier contact portal access is enforced at the API boundary
- one supplier contact cannot access another supplier's records
- supplier contacts can be removed only when they are not primary contacts
- access changes publish audit records and human-readable notifications

Definition of done:

- route tests cover admin link, invite, unlink, inactive contact, and
  cross-supplier denial
- contracts expose public references, never internal IDs
- supplier portal navigation only appears for linked supplier contacts
- email failure does not lose the portal invite record
- supplier invite email template is configurable with an admin preview before
  production rollout

### `E-03-05B` email reliability foundation

Status:
- started
- implemented so far: auth and supplier invite emails now record durable
  delivery attempts for console fallback, provider acceptance, and provider
  failure; provider message IDs are stored when available; delivery records
  intentionally avoid storing email body content or tokenized URLs; schema
  migration `0028` was generated and applied
- remaining before complete: supplier invite resend flow, admin-facing delivery
  history, in-app fallback notifications, provider health surface, configurable
  email templates, and branded template previews

Goal:
- make supplier invites and auth emails operationally reliable

Acceptance criteria:

- email provider configuration is validated at startup or health check
- failed provider sends return structured problem details
- important emails have send history with status, recipient, type, provider
  response, and failure reason
- admins can resend supplier invitations
- verification and password-reset failures are visible and actionable
- every email-triggered business event also creates an in-app notification

Definition of done:

- tests cover missing provider config, invalid sender, provider rejection,
  resend, and in-app fallback
- support logs are safe and do not leak tokens
- email templates use configured brand identity where available
- email templates are editable from settings with a preview using realistic
  sample data before sending

### `E-03-05C` supplier conversations

Goal:
- replace one-way enquiry response fields with two-way thread-backed
  communication

Acceptance criteria:

- admin can start a supplier conversation
- supplier contact can start a supplier conversation
- conversation types include general, sourcing inquiry, product proposal, quote
  request, purchase order, and price change
- messages support text, image attachments, and PDF attachments
- users can edit their own message with append-only edit history
- users can soft-delete eligible messages without losing audit evidence
- system messages are recorded for lifecycle events
- unread counts and waiting-on status are maintained
- open thread views poll for new messages and refetch after send

Definition of done:

- message create/edit/delete operations are permission checked server-side
- attachment upload uses the established media upload system
- thread and message APIs use references, not internal IDs
- notifications are created for new supplier/admin messages
- current enquiry creation creates a thread and first message
- old `Convert` wording is removed or replaced with explicit actions

### `E-03-05D` supplier product proposals

Goal:
- allow suppliers to propose new goods and ask admins whether the business is
  interested

Acceptance criteria:

- supplier can create a product proposal conversation
- proposal captures product name, description, suggested brand/category,
  images, specification files, suggested price range, MOQ, lead time, and notes
- admin can reply, request more information, request a quote, reject/archive,
  or create a draft catalog product from the proposal
- duplicate proposal risk is surfaced when name or attachments resemble an
  existing catalog product

Definition of done:

- supplier-created proposal is visible to admins through notifications and the
  supplier detail page
- rejected and archived proposals remain searchable for audit
- catalog product creation from proposal preserves source context

### `E-03-05E` supplier offer catalog

Goal:
- let suppliers maintain reusable pricing and supply terms for supplied SKUs

Acceptance criteria:

- supplier offer exists per supplier and SKU
- offer records store supplier product code, default unit price, currency, MOQ,
  pack size, lead time, capacity, valid-until date, terms, notes, and
  attachments
- supplier can save draft offers and publish active offers
- supplier can bulk update common fields
- supplier can import offer values from previous quotes
- admin can view offer coverage by product and SKU
- offer changes create append-only revisions
- material price changes notify admins

Definition of done:

- supplier offer revisions preserve old and new values
- supplier offer prices do not automatically mutate internal SKU cost prices
- admin review is required before applying supplier price to internal cost
- quote screens can prefill from active offers

### `E-03-05F` quote request lifecycle

Goal:
- support formal quote requests for catalog SKUs and external goods

Acceptance criteria:

- admin creates quote request for one supplier
- quote request supports multiple lines
- each line can reference a catalog SKU or an external requested good
- admin enters requested quantity, needed date, destination, notes, and
  attachments
- supplier quote lines prefill from active offers or previous quotes
- supplier can submit quote, partially quote, mark a line unavailable, or
  request clarification
- admin can accept, reject, cancel, or request revision
- quote revisions are versioned
- accepted quote snapshots into a purchase-order-ready state

Definition of done:

- quote submission snapshots price, currency, quantity, lead time, terms, and
  attachments
- accepting an expired or superseded quote is blocked
- two admins cannot accept conflicting quote revisions
- quote status changes publish platform events and notifications

### `E-03-05G` purchase order and goods receipt

Goal:
- create purchase orders from accepted quotes and receive goods into stock

Acceptance criteria:

- accepted quote can create a purchase order
- purchase order lines lock accepted quote values
- supplier can acknowledge purchase order
- admin/manager can receive goods against purchase order lines
- partial receipt is supported
- stock updates are idempotent
- supplier transactions show purchase order and receipt history

Definition of done:

- purchase order snapshots are immutable after issue except lifecycle status
- receipt writes stock movements once per receipt event
- duplicate receipt attempts are blocked or handled idempotently
- purchase order documents use official document configuration

### `E-03-05H` supplier price review and internal cost updates

Goal:
- review supplier price changes before changing internal cost prices

Acceptance criteria:

- supplier offer price changes create review records
- admin sees old supplier price, new supplier price, current internal cost, and
  last accepted quote price
- admin can approve applying supplier price to SKU cost price or reject it
- approval writes an audited internal cost update
- rejection preserves supplier offer price but does not affect internal cost

Definition of done:

- cost price update is transactional with review approval
- review actions publish platform events
- bulk supplier price updates are grouped to avoid notification floods

## Edge Cases To Cover

### Access

- supplier contact leaves the supplier but still has a portal account
- one user is accidentally linked to two suppliers
- primary contact is inactive
- supplier is inactive but has open quotes or purchase orders
- invite expires or is never accepted
- supplier contact permissions differ by role

### Conversations

- attachment upload succeeds but message send fails
- message send succeeds but notification creation fails
- two users reply or edit at the same time
- edited message was already used as quote evidence
- user loses permission while a thread is open
- resolved or archived thread receives a reply attempt
- one thread involves multiple products or SKUs

### Product Proposals

- proposed product already exists under another name
- supplier proposes multiple variants at once
- supplier proposes goods later marked unavailable
- admin rejects proposal and supplier resubmits

### Offers And Pricing

- supplier changes currency
- supplier price expires before quote acceptance
- offer changes while quote request is open
- supplier offers quantity-tier pricing
- supplier offers location-specific delivery terms
- supplier price and internal cost intentionally diverge
- supplier enters tax-inclusive price where internal cost expects tax-exclusive

### Quotes

- supplier partially quotes a request
- supplier quotes less quantity than requested
- supplier submits after due date
- supplier submits a newer revision while admin is reviewing an older one
- admin accepts quote after expiry
- external quote line later becomes catalog product

### Purchase Orders

- supplier acknowledges with changes
- supplier fulfils part of an order
- received goods are damaged or rejected
- supplier invoice differs from purchase order price
- exchange rate changes between quote, purchase order, invoice, and payment
- product is archived after quote but before receipt

### Notifications And Email

- duplicate notifications from bulk updates
- email provider is unavailable
- email sends but webhook/provider status later reports failure
- in-app notification is created but email fails
- supplier invite email is resent after contact email changes

## Implementation Order

1. `E-03-05A` supplier contact portal access
2. `E-03-05B` email reliability foundation
3. `E-03-05C` supplier conversations
4. `E-03-05D` supplier product proposals
5. `E-03-05E` supplier offer catalog
6. `E-03-05F` quote request lifecycle
7. `E-03-05G` purchase order and goods receipt
8. `E-03-05H` supplier price review and internal cost updates

## Open Product Decisions

- Should a supplier contact ever represent multiple supplier organizations?
  Default answer: no.
- Should quote requests support multiple suppliers in the first release?
  Default answer: no; start with single supplier and later add RFQ comparison.
- Should supplier message edits have a time limit?
  Default answer: yes, but all edits keep history.
- Should supplier offer price changes require admin approval before suppliers can
  use them in quotes?
  Default answer: no; approval is only required before changing internal cost.
- Should supplier product proposals create draft catalog products automatically?
  Default answer: no; admin must explicitly create the draft product.
