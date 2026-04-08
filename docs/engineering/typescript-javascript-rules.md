# TypeScript and JavaScript Rules

These rules are mandatory for application code unless a specific file has a justified exception.

## Nullish and boolean operators

- Use `??` for fallback values when `0`, `false`, `""`, or `[]` are valid inputs that must be preserved.
- Use `||` only when every falsy value should intentionally collapse to the fallback.
- Do not use `||` to default counts, prices, booleans, or user-entered text.
- Use `??=` only when mutating an existing object is intentional and the nullish-only semantics are correct.
- Prefer explicit boolean expressions over stacked truthy checks when the branch carries business meaning.

## Equality and branching

- Use `===` and `!==` exclusively. Do not use `==` or `!=` except for an intentional `value == null` null-or-undefined check.
- Prefer early returns over nested `if` blocks.
- Prefer `switch` when branching on a closed union or enum-like value.
- Use exhaustive handling for discriminated unions and status values.

## Optional access and defaults

- Prefer `?.` over chained guard clauses for nested optional reads.
- Do not hide missing required data behind optional chaining. Validate it and fail explicitly.
- Keep fallback values close to the read site so defaults are easy to reason about.

## Variables and expressions

- Default to `const`. Use `let` only for reassignment with a clear local reason.
- Keep expressions side-effect free when possible.
- Extract opaque boolean expressions into named helpers when they represent domain logic.
- Avoid double negatives in variable names and conditions.

## Collections and transforms

- Prefer `map`, `filter`, `find`, `some`, and `every` over manual loops when the intent is clearer.
- Use `Set` or `Map` when uniqueness or keyed lookup is part of the requirement.
- Do not use array indexes as React keys when stable identifiers exist.

## Functions and errors

- Make return types obvious. Add explicit return types on exported functions when inference is not immediately clear.
- Throw structured domain or transport errors, not raw strings.
- Keep helper functions small and single-purpose when they encode reusable policy.

## File size

- Keep production source files at or below `250` lines.
- Keep test files at or below `350` lines.
- When a file approaches the limit, extract helpers, subcomponents, selectors, or mappers before adding more behavior.
- Do not bypass the limit by moving unrelated concerns into one large utility file.

## TypeScript-specific rules

- Model domain states with unions and named types instead of loose string bags.
- Prefer `unknown` over `any`. Narrow before use.
- Keep public DTOs, contracts, and store state types close to their owning module.
- Use `satisfies` when checking object shape without widening away useful inference.

## Review prompts

- Should this fallback be `??` instead of `||`?
- Is optional chaining hiding a required invariant?
- Is this branch operating on boolean logic or generic truthiness?
- Would a named type or union make this state safer?
