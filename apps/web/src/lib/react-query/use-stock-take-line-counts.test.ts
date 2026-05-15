import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK_SOURCE_PATH = fileURLToPath(
  new URL("./use-stock-take-line-counts.ts", import.meta.url),
);

describe("useUpdateStockTakeLineCounts (regression guards)", () => {
  it("does not depend on tanstack-query's useMutation in the scheduler factory", () => {
    // Regression for the code-review finding: a previous implementation
    // listed `useMutation`'s return value in the scheduler useMemo deps.
    // That made the scheduler rebuild on every render, dropping the
    // pending edits map and the in-flight race guard between renders.
    //
    // The hook must NOT use `useMutation` for the line-count flush —
    // it should call the network function (`updateStockTakeLineCounts`)
    // directly. This test reads the source and asserts the hook does
    // not re-import useMutation. Brittle but catches the exact
    // regression without requiring a real React renderer.
    const source = readFileSync(HOOK_SOURCE_PATH, "utf8");
    // Check the import statement specifically, not arbitrary mentions
    // (the explanatory comment in the hook itself names useMutation).
    const importMatch = source.match(
      /^import \{([^}]*)\} from "@tanstack\/react-query";/m,
    );
    assert.ok(importMatch, "expected a tanstack-query import statement");
    const imported = (importMatch[1] ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    assert.ok(
      !imported.includes("useMutation"),
      "use-stock-take-line-counts.ts must not import useMutation from tanstack-query; calling updateStockTakeLineCounts directly keeps the scheduler stable across renders",
    );
  });

  it("only depends on stable references in the scheduler useMemo", () => {
    const source = readFileSync(HOOK_SOURCE_PATH, "utf8");
    // The scheduler useMemo deps array must consist of references that
    // are stable across renders. portal + reference are props, queryClient
    // is provider-managed and stable, setStatusForLines is wrapped in
    // useCallback with empty deps. Any reactive value (e.g. a hook-result
    // object, state, derived values) in here would defeat the memoisation.
    const memoMatch = source.match(
      /}, \[([^\]]*)\]\);\s*\n\s*const queueEntry/,
    );
    assert.ok(
      memoMatch,
      "expected to find the scheduler useMemo dependency array",
    );
    const deps = (memoMatch[1] ?? "")
      .split(",")
      .map((dep) => dep.trim())
      .filter((dep) => dep.length > 0)
      .sort();
    assert.deepEqual(deps, [
      "portal",
      "queryClient",
      "reference",
      "setStatusForLines",
    ]);
  });
});
