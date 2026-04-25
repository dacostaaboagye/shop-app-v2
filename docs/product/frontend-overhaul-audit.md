# Frontend Overhaul Audit

Last updated: 2026-04-25

## Current Findings

### Internal Operational References Leak Into User UI

Evidence:

- testing environment shows `Reference ID: req-*` in normal error cards
- shared frontend error helpers append backend request IDs into user-facing copy
- shared error surfaces render request IDs directly under the main message

Risk:

- exposes internal support/debug references with no end-user value
- makes production screens feel unstable and developer-oriented
- trains the UI toward technical leakage instead of calm operational messaging

Required fix:

- hide internal request references from normal user-facing error surfaces by
  default
- allow explicit support/debug surfaces to opt in deliberately

### Design-System Drift

Symptoms:

- multiple page shells and workspace compositions
- inconsistent action grouping and card structure
- mixed visual density and surface treatment

### Typography Drift

Symptoms:

- inconsistent heading scale across pages
- uneven body/support-copy hierarchy
- inconsistent emphasis for money, counts, and operational summaries
- font usage is not consistently governed through shared rules

### Color-System Drift

Symptoms:

- semantic color usage is not enforced strongly enough
- some screens still feel visually inconsistent even when functionally correct
- brand-driven color behavior is not yet constrained through one runtime token
  model

### Resilience Drift

Symptoms:

- some async screens still have uneven loading, empty, and error treatment
- error language is not consistently calm, specific, and recoverable

### Content Discipline Drift

Symptoms:

- some screens show technical or low-value data that users cannot act on
- wording varies by page family for the same workflow concepts

### Growth And Overflow Risk

Symptoms:

- long names, references, and reason fields do not always have deliberate layout
  handling
- filters and actions can become crowded on narrower widths

### Sensitive Display Inconsistency

Symptoms:

- money and quantity presentation still vary by page
- operational references and statuses are not standardized enough yet

## Immediate Priority

1. stop internal request-reference leakage
2. define semantic token, typography, and runtime-theme architecture
3. standardize shared display, color, and error rules
4. migrate page families on top of the new system
