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
    const sequenceValue = await this.repository.reserveNextSequenceValue({
      description: getSequenceDescription(input.sequenceKey),
      now,
      sequenceKey: resolveSequenceStorageKey({
        now,
        sequenceKey: input.sequenceKey,
      }),
      startsAt: getSequenceStartAt(
        input.sequenceKey,
        this.options.startsAt?.[input.sequenceKey],
      ),
    });

    return formatReferenceNumber({
      now,
      sequenceKey: input.sequenceKey,
      sequenceValue,
    });
  }

  generateCreditNoteReference(parentReference: string): string {
    return deriveCreditNoteReference(parentReference);
  }
}
