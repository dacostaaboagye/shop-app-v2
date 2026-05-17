import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ReferenceNumberRepository,
  ReferenceNumberService,
} from "../src/modules/public-identifiers/reference-number.service.js";
import type { ReferenceSequenceKey } from "../src/modules/public-identifiers/reference-number-formats.js";

const deliverySequenceKey = "delivery" as ReferenceSequenceKey;

describe("ReferenceNumberService", () => {
  it("generates padded invoice references from channel counters", async () => {
    const harness = createHarness();

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "invoice-pos",
    });

    assert.equal(reference, "INV-POS-00001");
    assert.deepEqual(harness.state.sequenceKeys, ["invoice-pos"]);
  });

  it("generates padded grouped supply request references", async () => {
    const harness = createHarness();

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "supply-request-group",
    });

    assert.equal(reference, "SUPB-00001");
    assert.deepEqual(harness.state.sequenceKeys, ["supply-request-group"]);
  });

  it("generates year-scoped stock-take references", async () => {
    const harness = createHarness();

    const reference = await harness.service.generateReference({
      now: new Date("2026-05-04T10:00:00.000Z"),
      sequenceKey: "stock-take",
    });

    assert.equal(reference, "STKTAKE-2026-0001");
    assert.deepEqual(harness.state.sequenceKeys, ["stock-take:2026"]);
  });

  it("generates padded delivery header public references", async () => {
    const harness = createHarness();

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: deliverySequenceKey,
    });

    assert.equal(reference, "DLV-00001");
    assert.deepEqual(harness.state.sequenceKeys, ["delivery"]);
  });

  it("supports configurable starting numbers per channel", async () => {
    const harness = createHarness({
      startsAt: {
        "invoice-pos": 421,
        [deliverySequenceKey]: 42,
      },
    });

    const invoiceReference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "invoice-pos",
    });
    const deliveryReference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: deliverySequenceKey,
    });

    assert.equal(invoiceReference, "INV-POS-00421");
    assert.equal(deliveryReference, "DLV-00042");
  });

  it("uses UTC date-scoped counters for portal order references", async () => {
    const harness = createHarness();

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T23:59:59.000-05:00"),
      sequenceKey: "portal-order",
    });

    assert.equal(reference, "CPO-20260409-0001");
    assert.deepEqual(harness.state.sequenceKeys, ["portal-order:20260409"]);
  });

  it("resets date-scoped counters on a new UTC day", async () => {
    const harness = createHarness();

    const firstDayReference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "delivery-item",
    });
    const secondDayReference = await harness.service.generateReference({
      now: new Date("2026-04-09T10:00:00.000Z"),
      sequenceKey: "delivery-item",
    });

    assert.equal(firstDayReference, "DEL-20260408-0001");
    assert.equal(secondDayReference, "DEL-20260409-0001");
  });

  it("derives credit note references from the parent invoice", () => {
    const harness = createHarness();

    const reference =
      harness.service.generateCreditNoteReference("inv-pos-00421");

    assert.equal(reference, "CRN-INV-POS-00421");
  });

  it("keeps same-key references unique and sequential under concurrency", async () => {
    const harness = createHarness();

    const references = await Promise.all(
      Array.from({ length: 100 }, () =>
        harness.service.generateReference({
          now: new Date("2026-04-08T10:00:00.000Z"),
          sequenceKey: "invoice-web",
        }),
      ),
    );

    assert.equal(new Set(references).size, 100);
    assert.deepEqual(
      references.slice().sort(),
      Array.from(
        { length: 100 },
        (_, index) => `INV-WEB-${(index + 1).toString().padStart(5, "0")}`,
      ),
    );
  });

  it("emits non-blocking reservation metadata for gap reconciliation", async () => {
    const reservedReferences: Array<{
      reference: string;
      sequenceKey: string;
      sequenceStorageKey: string;
      sequenceValue: number;
    }> = [];
    const harness = createHarness({
      onReferenceReserved(event) {
        reservedReferences.push({
          reference: event.reference,
          sequenceKey: event.sequenceKey,
          sequenceStorageKey: event.sequenceStorageKey,
          sequenceValue: event.sequenceValue,
        });
      },
    });

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "invoice-pos",
    });

    assert.equal(reference, "INV-POS-00001");
    assert.deepEqual(reservedReferences, [
      {
        reference: "INV-POS-00001",
        sequenceKey: "invoice-pos",
        sequenceStorageKey: "invoice-pos",
        sequenceValue: 1,
      },
    ]);
  });

  it("keeps a reserved reference valid when reservation logging fails", async () => {
    const harness = createHarness({
      onReferenceReserved() {
        throw new Error("logger unavailable");
      },
    });

    const reference = await harness.service.generateReference({
      now: new Date("2026-04-08T10:00:00.000Z"),
      sequenceKey: "invoice-pos",
    });

    assert.equal(reference, "INV-POS-00001");
  });
});

function createHarness(input?: {
  onReferenceReserved?: (event: {
    occurredAt: Date;
    reference: string;
    sequenceKey: ReferenceSequenceKey;
    sequenceStorageKey: string;
    sequenceValue: number;
  }) => Promise<void> | void;
  startsAt?: Partial<Record<ReferenceSequenceKey, number>>;
}) {
  const state = {
    counters: new Map<string, number>(),
    lastOperation: Promise.resolve(),
    sequenceKeys: [] as string[],
  };
  const repository: ReferenceNumberRepository = {
    reserveNextSequenceValue(command) {
      state.sequenceKeys.push(command.sequenceKey);

      return enqueueAtomically(state, () => {
        const currentValue = state.counters.get(command.sequenceKey);
        const nextValue =
          currentValue == null ? command.startsAt : currentValue + 1;
        state.counters.set(command.sequenceKey, nextValue);
        return nextValue;
      });
    },
  };

  return {
    service: new ReferenceNumberService(repository, {
      ...(input?.onReferenceReserved
        ? { onReferenceReserved: input.onReferenceReserved }
        : {}),
      ...(input?.startsAt ? { startsAt: input.startsAt } : {}),
    }),
    state,
  };
}

async function enqueueAtomically<T>(
  state: {
    counters: Map<string, number>;
    lastOperation: Promise<void>;
  },
  operation: () => T,
): Promise<T> {
  const previousOperation = state.lastOperation;
  let release = () => {};

  state.lastOperation = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previousOperation;

  try {
    return operation();
  } finally {
    release();
  }
}
