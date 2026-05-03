# Backlog scope summary

A snapshot of the master xlsx so we don't have to parse it every session.

> **Source**: `Building and Refining Product Backlog(2).xlsx` at the repo root.
> **Last derived**: 2026-05-02. The `Audit Summary` sheet itself is still stamped 2026-05-01 — Tier-A counts and statuses are unchanged since then; the only material xlsx update is that EPIC4 has now been authored (see Tier B).
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

47 tickets broken into stories on the `Backlog Audit` sheet. **38 done · 5 partial · 4 not started — 81% done**. All P0 or P1.

### By area

| Code range | Area | Done | Partial / Not Started |
|---|---|---|---|
| **E-00A-01..06** | Stock ownership foundation (append-only event ledger, ownership resolution, assignment, handover, sales attribution, history view) | 6/6 ✓ | — |
| **E-00B-01..07** | Stock balance + reservation foundation (real-time balance, reservation lifecycle, expiry release, movement sync, manager release, movement events, admin reservations endpoint) | 7/7 ✓ | — |
| **E-00C-01..05** | **Deliveries foundation** | 1/5 | C-02..05 not started (all P0) |
| **E-00D-01..07** | Access control + identifiers + portal routing foundation | 6/7 | D-07 lint+CI route-access guard partial |
| **E-01-01..10** | Auth + navigation + notifications | 10/10 ✓ | — |
| **E-02-01..05** | Locations | 4/5 | E-02-01 CRUD + zones + deactivation guard partial |
| **E-03-01..07** | Catalog | 4/7 | E-03-02 bulk import, E-03-06 change-history UI, E-03-07 immutable change-log table all partial |

### The 9 unfinished tickets (everything left in tier A)

#### P0 — deliveries module (E-00C, all 5 tickets, must ship in order)

| Code | Status | Gap |
|---|---|---|
| E-00C-02 | Not Started | No status state machine (created → assigned → en route → delivered/failed). |
| E-00C-03 | Not Started | No agent assignment service or routes. |
| E-00C-04 | Not Started | Service layer for `assignDelivery` / `reassignDelivery` / `listDeliveriesByAgent` / `listByLocation`. |
| E-00C-05 | Not Started | REST endpoints for delivery CRUD, assignment, status, filtered queries. |

E-00C-01 is complete in the Markdown working surface and workbook status. The next unblocked delivery item is E-00C-02, because the status lifecycle is the spine every other delivery feature plugs into.

#### P1 — scattered

| Code | Status | Gap |
|---|---|---|
| E-00D-07 | Partial | Route middleware works; **lint rule + CI audit script that fails the build on missing `config.access`** still to write. |
| E-02-01 | Partial | Locations module exists but **most CRUD + zones + deactivation guard** still pending. |
| E-03-02 | Partial | Schema + contracts ready; **upload handler / parser / dry-run preview** still to ship. |
| E-03-07 | Partial | Audit columns capture changes; **dedicated immutable `change_log` table per ADR** not yet broken out. **Blocks E-03-06.** |
| E-03-06 | Partial | Capture exists; **human-readable diff UI** is minimal. Becomes a thin wrapper once E-03-07 lands. |

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

- **E-00C deliveries module gates four phase-2 epics.** E-12, E-14, E-15, E-16 all list E-00C as a dependency. Finishing the deliveries module isn't just closing a phase-1 P0 batch — it unblocks the whole online-sales + delivery-agent portal stack.
- **E-04 is the most-referenced phase-2 epic.** Ten downstream epics name it as a dependency. Now that it's authored as "Inventory tracking per location" (variant + location stock counts, adjustments, stock takes, thresholds), sizing for E-05..E-15 is no longer blocked on PO definition. E-04 itself depends only on E-00B / E-02 / E-03 — all done or near done — so it can start as soon as the PO breaks it into tickets in `Backlog Audit`.
- **E-09 (invoice management) gates E-07 + E-12 + E-14 + E-16.** Still unticketed. Will need to land before any sales channel is finished.
- **E-13 → E-14 → E-15 → E-16** is the e-commerce ladder. Storefront → fulfilment → delivery → payments. None can start until E-00C ships.

## Authoring issues to flag to the PO

These are oddities in the xlsx itself, not the work — worth noting so they get fixed in the next backlog audit.

1. **E-04 still needs ticketing.** The epic is now authored on the `EPIC4` sheet ("Inventory tracking per location") — but it has no rows in `Backlog Audit`. The PO needs to break it into tickets before the orchestrator can run it.
2. **EPIC1, EPIC2, EPIC3 sheets are stubs** — they only contain the area headline and a paragraph of intent. The actual stories live as the `E-01-XX` / `E-02-XX` / `E-03-XX` rows in `Backlog Audit` and the right-side columns of the raw `Backlog` sheet.
3. **EPIC11 sheet duplicates its own body.** The supplier portal stories appear twice in the same sheet — paste artifact.
4. **EPIC13 sheet has two overlapping headers** ("E-13 E-commerce: Online storefront..." and "E-13 → E-16: E-commerce channel revised v3"). The two need to be reconciled into a single description.
5. **E-06 partially overlaps with E-00A.** Worker assignment + handover is already shipped at the foundation tier (E-00A-03/04). E-06 covers the same conceptual ground with fuller worker-portal UX scope. Whether E-06 stays as a separate epic or is reframed as "follow-on UI for E-00A" is a PO call.

## Recommended runway

Based on what's in the xlsx today, the first ~6 epics are clear:

1. **E-00C-02..05** — continue the deliveries module. Four remaining P0s, mostly backend, sequential. Unblocks E-12/E-14/E-15/E-16 downstream.
2. **E-00D-07** — close the route-access lint + CI audit. Small effort, large safety per `Next Up` sheet rationale.
3. **E-02-01** — finish location lifecycle (CRUD + zones + deactivation guard).
4. **E-03-07 → E-03-06** — immutable change-log table first, then UI view (linear dependency).
5. **E-03-02** — catalog bulk import.

After that, the PO needs to break **E-04** into tickets in `Backlog Audit` so the rest of phase-2 (E-05..E-15) can be sized against it.
