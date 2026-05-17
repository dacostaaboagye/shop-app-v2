import {
  deriveCreditNoteReference,
  formatReferenceNumber,
  getSequenceDescription,
  getSequenceStartAt,
  type ReferenceSequenceKey,
  resolveSequenceStorageKey,
} from "./reference-number-formats.js";

export interface ReferenceNumberRepository {
  reserveNextSequenceValue(input: {
    description: string;
    now: Date;
    sequenceKey: string;
    startsAt: number;
  }): Promise<number>;
}

type ReferenceNumberServiceOptions = {
  onReferenceReserved?: (event: {
    occurredAt: Date;
    reference: string;
    sequenceKey: ReferenceSequenceKey;
    sequenceStorageKey: string;
    sequenceValue: number;
  }) => Promise<void> | void;
  startsAt?: Partial<Record<ReferenceSequenceKey, number>>;
};

export class ReferenceNumberService {
  constructor(
    private readonly repository: ReferenceNumberRepository,
    private readonly options: ReferenceNumberServiceOptions = {},
  ) {}

  async generateReference(input: {
    now?: Date;
    sequenceKey: ReferenceSequenceKey;
  }): Promise<string> {
    const now = input.now ?? new Date();
    const sequenceStorageKey = resolveSequenceStorageKey({
      now,
      sequenceKey: input.sequenceKey,
    });
    const sequenceValue = await this.repository.reserveNextSequenceValue({
      description: getSequenceDescription(input.sequenceKey),
      now,
      sequenceKey: sequenceStorageKey,
      startsAt: getSequenceStartAt(
        input.sequenceKey,
        this.options.startsAt?.[input.sequenceKey],
      ),
    });

    const reference = formatReferenceNumber({
      now,
      sequenceKey: input.sequenceKey,
      sequenceValue,
    });

    this.notifyReferenceReserved({
      occurredAt: now,
      reference,
      sequenceKey: input.sequenceKey,
      sequenceStorageKey,
      sequenceValue,
    });

    return reference;
  }

  generateCreditNoteReference(parentReference: string): string {
    return deriveCreditNoteReference(parentReference);
  }

  private notifyReferenceReserved(event: {
    occurredAt: Date;
    reference: string;
    sequenceKey: ReferenceSequenceKey;
    sequenceStorageKey: string;
    sequenceValue: number;
  }): void {
    try {
      const result = this.options.onReferenceReserved?.(event);
      if (result) {
        void result.catch(() => {});
      }
    } catch {
      // Reservation visibility must never make a successfully reserved
      // reference fail after the counter has advanced.
    }
  }
}
