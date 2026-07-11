# Backlog scope summary

A snapshot of the master xlsx so we don't have to parse it every session.

> **Source**: `Building and Refining Product Backlog(2).xlsx` at the repo root.
> **Last derived**: 2026-05-03. Markdown closure updates were appended after PR #79, PR #107, PR #108, PR #110, PR #111, PR #141, PR #154, PR #155, PR #159, PR #161, and PR #209 merged; re-run the xlsx refresh flow to make the workbook-backed snapshot authoritative again.
> **Authority**: the xlsx is the source of truth. This doc reflects state at the time it was written. **Re-derive from the xlsx whenever priority or status decisions are at stake** — do not trust this doc for current status if any time has passed since the date above.
>
> **To refresh**: ask Claude to "refresh the scope summary" (or invoke `/refresh-backlog-summary`). The skill at `.claude/skills/refresh-backlog-summary/SKILL.md` re-reads the xlsx, updates this file, and opens a PR.

## When to read this vs the xlsx

| Question | Use |
|---|---|
| What's the overall scope? What epics exist? What depends on what? | This doc. |
| What's the priority order right now? What's `Next Up`? | The xlsx `Next Up` sheet — it's reordered as priorities shift. |
| What's the current status of ticket X? | The xlsx `Backlog Audit` sheet — it's the live audit. |
| What are the user stories under epic Y? | The xlsx `EPICn` sheet — full text lives there. |
| What does an unfinished ticket actually need? | The xlsx `Backlog Audit` notes column for that row. |

## Tier A — phase-1 + foundation tickets

48 tickets broken into stories on the `Backlog Audit` sheet. **48 done - 0 partial / needs audit - 100% done**. All P0 or P1.

### By area

| Code range | Area | Done | Partial / Not Started |
|---|---|---|---|
| **E-00A-01..06** | Stock ownership foundation (append-only event ledger, ownership resolution, assignment, handover, sales attribution, history view) | 6/6 ✓ | — |
| **E-00B-01..07** | Stock balance + reservation foundation (real-time balance, reservation lifecycle, expiry release, movement sync, manager release, movement events, admin reservations endpoint) | 7/7 ✓ | — |
| **E-00C-01..06** | **Deliveries foundation** | 6/6 | - |
| **E-00D-01..07** | Access control + identifiers + portal routing foundation | 7/7 | - |
| **E-01-01..10** | Auth + navigation + notifications | 10/10 ✓ | — |
| **E-02-01..05** | Locations | 5/5 | - |
| **E-03-01..07** | Catalog | 7/7 | E-03-02 bulk import, E-03-07 immutable change-log, and E-03-06 history UI are shipped |

### Tier A completion

#### Closed P0 - deliveries module (E-00C)

E-00C-01 through E-00C-06 are complete in the Markdown working surface. PR #107 closed the public delivery identifier blocker, which also lets E-00C-05 meet REST API DoD.

#### Closed P1 - locations, catalog, and route-access safety

E-02-01, E-00D-07, and E-03-02 are complete in the Markdown working surface. PR #110 shipped product/variant bulk import; PR #111 shipped dedicated brand/category bulk imports.

## Tier B — phase-2+ epics defined but **not yet ticketed**

These live as `EPICn` sheets in the xlsx. They have a title, story bullets, edge cases, and a `Depends on` line — but no per-ticket breakdown in `Backlog Audit`. The PO has to refine them before the orchestrator can run them.

| Code | Title | Depends on |
|---|---|---|
| E-04 | Inventory tracking per location — initial counts, adjustments, stock takes, low-stock thresholds, all at the variant + location level | E-00B, E-02, E-03 |
| E-05 | Stock movements & transfers — receipts, transfers between locations, write-offs, restock requests, full movement history | E-00B, E-02, E-03, E-04 |
| E-06 | Stock assignment & handover (worker UX layer over E-00A) | E-00A, E-01, E-02, E-03, E-04 |
| E-07 | In-shop POS — multi-product sales, payments, discounts, credit notes, returns, INV-POS invoices | E-00A, E-00B, E-00D, E-04, E-06, E-09 |
| E-08 | Accountability — inspections, audits, loss investigations | E-01, E-02, E-04, E-05 |
| E-09 | Invoice management — INV-POS / INV-CPO / INV-WEB / CRN-, immutable, channel sequences | E-00D |
| E-10 | Role-scoped reporting & dashboards with CSV/PDF export | E-04, E-05, E-07, E-08, E-09 |
| E-11 | Supplier portal & procurement — POs, dispatch, receipt, backorders | E-01, E-03, E-04, E-05 |
| E-12 | Customer portal (B2B) — bulk orders, approvals, partial fulfilment | E-00B, **E-00C**, E-01, E-03, E-04, E-09 |
| E-13 | E-commerce storefront — public browse + cart with live stock | E-00B, E-03, E-04 |
| E-14 | Online order management & fulfilment — reserve, dispatch, INV-WEB | E-00B, **E-00C**, E-04, E-05, E-09, E-13 |
| E-15 | Delivery agent portal — unified workspace across e-com / portal / shop deliveries | **E-00C**, E-01, E-07, E-12, E-14 |
| E-16 | E-commerce buyer accounts & payments — auth, gateway, refunds, order state machine | E-00B, E-09, E-13, E-14, E-15 |

## Critical dependency facts

- **E-00C deliveries module is now complete in the Markdown working surface.** E-12, E-14, E-15, E-16 all list E-00C as a dependency, so the downstream online-sales + delivery-agent portal stack is no longer blocked by the delivery foundation.
- **E-04 is shipped in the Markdown working surface.** Ten downstream epics name it as a dependency. The delivered E-04 scope covers opening stock, reason-coded counts, stock takes, CSV/XLSX/PDF artifacts, dry-run validation, reviewed apply, in-app count entry, and missing-catalog intake review. E-05 can now start from stock receipts and movement hardening.
- **E-09 (invoice management) gates E-07 + E-12 + E-14 + E-16.** E-09-01, E-09-02, E-09-03, E-09-04, and E-09-05 are shipped in the Markdown working surface. Customer-facing channels now have customer-safe invoice list/detail/download APIs authorized through CRM customer contact relationships.
- **E-13 -> E-14 -> E-15 -> E-16** is the e-commerce ladder. Storefront -> fulfilment -> delivery -> payments. E-00C, E-04, and the E-09 customer-safe invoice layer are no longer the blockers; the next customer-facing value path is customer portal access and ordering on the CRM foundation.

## Authoring issues to flag to the PO

These are oddities in the xlsx itself, not the work — worth noting so they get fixed in the next backlog audit.

1. **The xlsx `Next Up` sheet is stale.** It still lists delivery/location/catalog foundation items that are already shipped in the Markdown working surface and on `dev`. Refresh the workbook before using it as the only source for priority ordering.
2. **EPIC1, EPIC2, EPIC3 sheets are stubs** — they only contain the area headline and a paragraph of intent. The actual stories live as the `E-01-XX` / `E-02-XX` / `E-03-XX` rows in `Backlog Audit` and the right-side columns of the raw `Backlog` sheet.
3. **EPIC11 sheet duplicates its own body.** The supplier portal stories appear twice in the same sheet — paste artifact.
4. **EPIC13 sheet has two overlapping headers** ("E-13 E-commerce: Online storefront..." and "E-13 → E-16: E-commerce channel revised v3"). The two need to be reconciled into a single description.
5. **E-06 partially overlaps with E-00A.** Worker assignment + handover is already shipped at the foundation tier (E-00A-03/04). E-06 covers the same conceptual ground with fuller worker-portal UX scope. Whether E-06 stays as a separate epic or is reframed as "follow-on UI for E-00A" is a PO call.

## Recommended runway

Based on the Markdown working surface and recent shipped PRs, the remaining near-term runway is:

1. **CRM-04 Customer Relationship On Sales Documents** - defined in `docs/product/customer-crm-workstream-plan.md`. Make sales document creation select existing CRM customers at the point of work so issued invoices/manual invoice requests carry a relationship link and immutable customer snapshot.

The PO still needs to mirror the shipped E-04/E-05/E-06, E-09-01..E-09-05, and E-12 CRM foundation state into `Backlog Audit` / `Next Up` in the workbook so the rest of phase-2 (E-07, E-12, E-14+) can be tracked by the authoritative queue.
