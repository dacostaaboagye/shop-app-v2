# Customer CRM Workstream Plan

## Status

Refined direction. This must land before customer-facing invoice access, customer portal ordering, ecommerce buyer accounts, or customer reporting.

## Why This Exists

Customer invoice access cannot be safely authorized by email address or invoice reference. A proper CRM foundation is needed so the platform can answer:

- who the customer is
- which contacts represent that customer
- which portal users are linked to those contacts
- which orders, invoices, deliveries, communications, and credits belong to that relationship
- who is allowed to view or act on that customer data

Without that foundation, customer-facing invoice access becomes fragile: shared inboxes, typo corrections, reused emails, guest checkout, B2B contacts, and changed staff contacts can all break or weaken authorization.

## Stakeholder Value

- **Business owner / admin:** one reliable customer record for sales, invoices, orders, communication, and account health.
- **Manager / sales operator:** can identify repeat customers, raise orders/invoices against the right relationship, and avoid duplicate records.
- **Finance:** can reconcile invoices, credit notes, outstanding balances, and customer statements by customer, not by free-text billing snapshots.
- **Customer contact:** can access only the invoices, orders, deliveries, and documents tied to their authorized customer relationship.
- **Support / operations:** can see customer history without asking users to remember invoice references or order numbers.

## Product Design Gate

CRM should not be a generic contact list. It must support operational jobs:

1. Find the right customer quickly during sale, manual invoice, or portal order handling.
2. Understand customer status, contacts, and billing/shipping context.
3. Link a portal user to a customer contact without granting broad operations access.
4. Prove why a customer can see an invoice, order, credit note, or delivery.
5. Preserve historical document snapshots even when customer details are edited later.

If a CRM field does not support identification, authorization, fulfilment, billing, communication, reporting, or auditability, do not add it in the first slice.

## CRM Scope Filter

Common CRM systems support a wide set of objects: accounts, contacts, leads, deals, activities, tickets, quotes, orders, invoices, payments, and conversations. Shop App should not copy that whole list up front.

For this platform, the most important CRM capabilities are:

- **Customer identity:** one trusted customer record with contacts, addresses, status, and duplicate controls.
- **Relationship proof:** a clear link between customer organization, customer contact, portal account, orders, invoices, credit notes, and deliveries.
- **Operational history:** a customer timeline for sales documents, orders, deliveries, notes, calls, emails, and account events.
- **Billing and fulfilment context:** payment terms, invoice recipients, default billing/shipping addresses, and customer document history.
- **Access control and audit:** immediate portal access revocation, append-only relationship history, merge evidence, and non-enumerable customer-facing access.

Defer these unless a stakeholder workflow proves they are needed:

- generic lead capture
- opportunity/deal forecasting
- marketing lists or campaigns
- full support ticketing/helpdesk
- advanced account scoring

## Core Model

### Customer Organization

Represents the customer relationship the business sells to.

Recommended fields:

- `reference` such as `CUS-{5digit}` for public-safe lookup
- `slug` for URLs
- `displayName`
- `legalName`
- `customerType`: `individual | business`
- `status`: `active | inactive | blocked`
- `taxNumber`
- `defaultCurrencyCode`
- `paymentTermsDays`
- `creditLimitAmount`
- `notes`
- audit timestamps and actor references

### Customer Contact

Represents a person tied to a customer organization.

Recommended fields:

- `reference`
- customer organization link
- `name`
- `email`
- `phone`
- `roleTitle`
- `isPrimary`
- `receivesInvoices`
- `receivesDeliveryUpdates`
- `status`: `active | inactive`
- optional linked portal user id

### Customer Address

Separate reusable billing and delivery addresses.

Recommended fields:

- customer organization link
- `label`
- `type`: `billing | shipping | both`
- recipient/contact fields
- address lines, city, region, country
- `isDefaultBilling`
- `isDefaultShipping`
- status

### Portal Access Link

A customer contact may be linked to one portal user account. The portal user should not be a workforce role.

Rules:

- customer registration/auth belongs under `/api/customer/auth/*` or an equivalent customer namespace per ADR 0021
- customer portal access is scoped through the customer contact link
- unlinking a contact revokes customer access without changing invoice history
- customer portal users can only read customer-owned surfaces unless explicitly granted future capabilities

### Historical Snapshots

Invoices, credit notes, orders, and delivery documents must keep immutable customer snapshots.

CRM edits update the current customer record; they do not rewrite issued documents.

### Customer Activity Timeline

Represents customer-facing and internal relationship events in one place.

First-slice timeline entries should include:

- issued invoices, credit notes, orders, deliveries, and manual invoice requests
- admin/manager notes
- customer contact invite/link/unlink/revoke events
- important email/share/download events where already captured by the document workflow

Calls, meetings, support cases, and rich conversations can be added later. The first value is to stop support, finance, and managers from reconstructing customer history across unrelated pages.

## Authorization Rules

Customer-facing access must be relationship-based:

- A customer portal actor can access an invoice only if the invoice is linked to a customer organization/contact they are authorized for.
- Credit notes and adjusted invoices inherit access through the authorized invoice chain.
- Possession of invoice reference is never enough.
- Matching email address is not enough.
- Workforce permissions and customer portal access are separate boundaries.
- Customer endpoints should use anti-enumeration behavior for guessed references.

## First Implementation Slices

### CRM-01 Customer Master Data

Goal: create the customer relationship model before customer portal access.

Scope:

- customer organization table
- customer contacts table
- customer addresses table
- public contracts and admin/manager APIs
- admin customer list/detail/create/update
- manager customer lookup and create within allowed sales workflow
- duplicate detection by normalized name/email/tax number
- append-only customer event/audit entries

Out of scope:

- public customer self-registration
- customer portal UI
- order placement
- invoice download
- marketing automation

### CRM-02 Customer Activity Timeline

Goal: give operators one customer history before adding more customer-facing surfaces.

Scope:

- customer detail timeline
- system events for customer create/update/contact/address changes
- linked invoice, credit note, order, delivery, and manual invoice request events
- internal notes with actor and timestamp
- safe filters for document, access, and note activity

Out of scope:

- full helpdesk tickets
- sales pipeline forecasting
- marketing campaign history
- two-way inbox sync

### CRM-03 Customer Portal Access

Goal: link customer contacts to customer portal accounts safely.

Shipped foundation:

- customer portal role/key distinct from operations roles
- existing user account link/unlink on customer contacts
- contact-level portal access status
- customer portal shell with account, preferences, and notifications routes
- customer event audit records for link/revoke actions

Scope:

- invite/link/unlink customer contact to portal user
- customer auth namespace following ADR 0021
- audit events for invite/link/unlink/revoke

Deferred:

- customer portal email invite flow and customer-specific invite template

### CRM-04 Customer Relationship On Sales Documents

Goal: connect invoices and manual invoice requests to customer records without losing snapshots.

Scope:

- optional `customerId` / `customerContactId` on invoices and manual invoice requests
- issue-time snapshot remains immutable
- manual invoice request can select or create a customer
- POS sale can optionally attach a customer
- invoice query/reporting can filter by customer

### CRM-05 Customer Invoice Access

Goal: implement E-09-04 safely after CRM links exist.

Scope:

- customer-safe invoice list/detail/download endpoints
- authorization through customer organization/contact link
- customer-safe DTOs only
- no workforce IDs, stock movement IDs, internal location IDs, or raw snapshot payload leakage
- credit note and adjusted invoice chain access

### CRM-06 Customer Portal Orders

Goal: enable E-12 customer portal ordering on top of CRM.

Scope:

- customer portal order creation
- approval workflow where required
- billing/shipping address selection
- invoice and delivery linkage

## UX Placement

Admin:

- primary CRM workspace: `/admin/customers`
- customer detail: overview, contacts, addresses, timeline, invoices, orders, deliveries, audit
- actions: create customer, add contact, invite portal contact, deactivate, merge candidate review

Manager:

- customer lookup should appear inside sales/order/manual invoice workflows
- managers should not be forced into a separate CRM page for a simple transaction
- a manager customer detail can exist later, but first value is lookup and correct selection at the point of work

Customer:

- customer portal should show account identity, orders, invoices, deliveries, and documents
- avoid exposing internal operational language
- invoices should be found from account history, not by asking customers to remember references

## Data Integrity Rules

- Use public references and slugs externally.
- Do not expose internal customer/contact/user ids in customer-facing DTOs.
- Keep issued document snapshots immutable.
- Merges must be explicit and auditable; do not auto-merge customer records silently.
- Deactivation blocks new transactions but does not hide historical invoices.
- Portal access revocation takes effect immediately.

## UAT Scenarios

1. Admin creates a business customer, adds two contacts, marks one as invoice recipient, and adds billing/shipping addresses.
2. Admin opens the customer timeline and sees customer creation, contact changes, invoice events, and an internal note in date order.
3. Manager starts a manual invoice request, selects an existing customer, and the invoice snapshot preserves the customer details at approval time.
4. Admin updates a customer's billing address and confirms an older invoice still shows the original issued snapshot.
5. Admin links a customer contact to portal access, then revokes it and confirms customer invoice access is blocked.
6. Customer contact signs in and sees only invoices for the linked customer organization.
7. Customer guesses another invoice reference and receives a non-disclosing not-found or forbidden response.

## Open Product Questions

- Is the first CRM customer model mainly B2B, B2C, or both?
- Should managers be allowed to create customers, or only request/create draft customers for admin review?
- Do customers need credit limits and payment terms in the first slice, or should those be read-only placeholders?
- Should duplicate resolution be merge-only by admin, or should managers be able to flag duplicates?
- Should customer portal users be separate from operations users in the same `users` table, or should we add a dedicated customer account table?
- Which communication events matter first: notes only, sent emails, calls, or customer replies?
- Do leads, opportunities, or support tickets have a real first-phase stakeholder journey, or should they stay deferred?
