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

  it("clears forced password change after a successful reset", async () => {
    const userUpdates: unknown[] = [];
    const db = createPasswordResetDbStub(userUpdates);
    const service = new PasswordResetService(
      db as never,
      {
        async findPasswordResetUser() {
          throw new Error("Not used by resetPassword");
        },
      },
      {
        async sendPasswordResetEmail() {
          throw new Error("Not used by resetPassword");
        },
      } as never,
      "https://app.example.com",
      () => NOW,
    );

    await service.resetPassword("reset-token", "NewPassword123!");

    assert.equal(userUpdates.length, 1);
    assert.equal(
      (userUpdates[0] as { requiresPasswordChange?: boolean })
        .requiresPasswordChange,
      false,
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

function createPasswordResetDbStub(userUpdates: unknown[]) {
  const resetRecord = {
    expiresAt: new Date("2026-04-26T18:00:00.000Z"),
    id: "token_123",
    tokenHash: "hashed-token",
    userId: "usr_123",
  };

  return {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                async limit() {
                  return [resetRecord];
                },
              };
            },
          };
        },
      };
    },
    async transaction(callback: (tx: ReturnType<typeof createTxStub>) => void) {
      await callback(createTxStub(userUpdates));
    },
  };
}

function createTxStub(userUpdates: unknown[]) {
  let updateIndex = 0;

  return {
    update() {
      updateIndex += 1;

      return {
        set(values: unknown) {
          if (updateIndex === 2) {
            userUpdates.push(values);
          }

          return {
            async where() {},
          };
        },
      };
    },
  };
}
