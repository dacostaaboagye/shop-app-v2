import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("web health route returns an ok payload", async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: "web",
    status: "ok",
  });
});
