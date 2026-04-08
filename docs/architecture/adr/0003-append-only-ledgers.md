# ADR 0003: Ownership and Audit Trails Are Append-Only

## Status

Accepted

## Context

The workbook treats ownership and audit history as legal and operational evidence. Overwriting that history would destroy accountability.

## Decision

- Ownership events are modeled as append-only ledger rows
- Audit tables are append-only unless a specific backlog item explicitly says otherwise
- Corrections are represented as new compensating events, not updates to historical rows
- Mutation permissions for immutable tables must be restricted at the database level where feasible
- Ownership supersession is resolved from event chronology, not by updating prior rows with closing timestamps
- The ownership ledger does not carry an `effective_to` column; ownership correctness comes from the latest event at or before the query time

## Consequences

- Query services carry more responsibility than CRUD repositories
- Debugging and investigations become possible without reconstructing history from logs
- Data migration work must preserve chronology, not just final state
- Reassignments, handover reversions, and similar corrections must be expressed as new events
