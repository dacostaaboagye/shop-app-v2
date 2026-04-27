# Email Template Client Review

Backlog ticket: `E-03-05B3`

This checklist records the manual desktop/mobile client evidence required before
Wave 1 launch. The review artifacts are generated from the same preview runtime
used by the app, not from separate mock HTML.

## Review Fixtures

Generate the fixtures with:

```bash
pnpm --filter @shop/api email:review-fixtures
```

Generated files:

- `docs/product/evidence/email-template-review-fixtures/emailVerification.html`
- `docs/product/evidence/email-template-review-fixtures/emailVerification.txt`
- `docs/product/evidence/email-template-review-fixtures/passwordReset.html`
- `docs/product/evidence/email-template-review-fixtures/passwordReset.txt`
- `docs/product/evidence/email-template-review-fixtures/supplierInvite.html`
- `docs/product/evidence/email-template-review-fixtures/supplierInvite.txt`

These fixtures intentionally use long headings, long CTA labels, and long
sender/support content so narrow-client defects are easier to catch.

## Required Clients

- one desktop client:
  - Gmail web or Outlook desktop
- one mobile client:
  - Gmail mobile or Apple Mail on iPhone

## Required Checks

For each of `emailVerification`, `passwordReset`, and `supplierInvite`:

- subject is readable and not truncated into meaningless fragments
- brand header stacks cleanly on narrow screens
- CTA remains readable and tappable on mobile
- long footer/support/fallback-link content wraps without horizontal overflow
- dark-mode rendering stays readable if the client applies dark colors
- plain-text variant reads naturally and preserves the action URL

## Review Record

Record completion here before closing `E-03-05B3`.

| Template | Desktop Client | Mobile Client | HTML Pass | Text Pass | Notes |
| --- | --- | --- | --- | --- | --- |
| `emailVerification` | Pending | Pending | Pending | Pending | |
| `passwordReset` | Pending | Pending | Pending | Pending | |
| `supplierInvite` | Pending | Pending | Pending | Pending | |
