import assert from "node:assert/strict";
import { describe, it } from "node:test";

import RegisterPage from "./page";

describe("RegisterPage", () => {
  it("redirects operations registration attempts to sign in", () => {
    assert.throws(
      () => RegisterPage(),
      (error) =>
        error instanceof Error &&
        error.message === "NEXT_REDIRECT" &&
        "digest" in error &&
        String(error.digest).includes("/login"),
    );
  });
});
