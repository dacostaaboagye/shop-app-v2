import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PasswordResetService } from "../src/modules/auth/password-reset.service.js";

const NOW = new Date("2026-04-26T17:00:00.000Z");

describe("PasswordResetService", () => {
  it("swallows email delivery failures after recording a reset token", async () => {
    const calls: string[] = [];
    const logged: unknown[][] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args);
    };

    try {
      const service = new PasswordResetService(
        createDbStub(calls) as never,
        {
          async findPasswordResetUser(email) {
            assert.equal(email, "worker@example.com");
            return {
              email,
              firstName: "Worker",
              id: "usr_123",
            };
          },
        },
        {
          async sendPasswordResetEmail(input: {
            firstName: string;
            resetUrl: string;
            to: string;
          }) {
            calls.push("send-email");
            assert.equal(input.to, "worker@example.com");
            assert.match(
              input.resetUrl,
              /^https:\/\/app\.example\.com\/reset-password\?token=/,
            );
            throw new Error("resend unavailable");
          },
        } as never,
        "https://app.example.com",
        () => NOW,
      );

      await assert.doesNotReject(() =>
        service.initiateReset("worker@example.com"),
      );

      assert.deepEqual(calls, [
        "invalidate-existing-tokens",
        "insert-reset-token",
        "send-email",
      ]);
      assert.equal(logged.length, 1);
      assert.match(
        String(logged[0]?.[0] ?? ""),
        /Failed to send password reset email/,
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("clears force-reset state and revokes sessions after password reset", async () => {
    const calls: Array<{ table: string; values: Record<string, unknown> }> = [];
    const service = new PasswordResetService(
      createResetDbStub(calls) as never,
      {
        async findPasswordResetUser() {
          return null;
        },
      },
      {
        async sendPasswordResetEmail() {},
      } as never,
      "https://app.example.com",
      () => NOW,
    );

    await service.resetPassword("valid-reset-token", "Password123");

    assert.equal(
      calls.some(
        (call) =>
          call.table === "users" &&
          call.values.requiresPasswordChange === false,
      ),
      true,
    );
    assert.equal(
      calls.some(
        (call) =>
          call.table === "refresh_tokens" &&
          call.values.revokedReason === "password_reset",
      ),
      true,
    );
  });
});

function createDbStub(calls: string[]) {
  return {
    update() {
      return {
        set() {
          return {
            async where() {
              calls.push("invalidate-existing-tokens");
            },
          };
        },
      };
    },
    insert() {
      return {
        async values() {
          calls.push("insert-reset-token");
        },
      };
    },
  };
}

function createResetDbStub(
  calls: Array<{ table: string; values: Record<string, unknown> }>,
) {
  return {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  return [{ id: "reset_1", userId: "usr_123" }];
                },
              };
            },
          };
        },
      };
    },
    async transaction(callback: (tx: unknown) => Promise<void>) {
      await callback(createResetTransactionStub(calls));
    },
  };
}

function createResetTransactionStub(
  calls: Array<{ table: string; values: Record<string, unknown> }>,
) {
  return {
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          calls.push({ table: tableName(table), values });

          return {
            async where() {},
          };
        },
      };
    },
  };
}

function tableName(table: unknown): string {
  const drizzleName = Symbol.for("drizzle:Name");

  if (typeof table === "object" && table !== null && drizzleName in table) {
    return String((table as Record<PropertyKey, unknown>)[drizzleName]);
  }

  return "unknown";
}
