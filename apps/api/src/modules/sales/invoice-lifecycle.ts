import {
  InvalidReturnError,
  type InvoiceWithLines,
} from "./sales.contracts.js";

export type InvoiceLifecycleReference = {
  parentInvoiceReference?: string | null;
  reference: string;
  replacementInvoiceReference?: string | null;
  revisionRootReference?: string | null;
  status: "confirmed" | "superseded" | "voided";
  type: "adjusted" | "credit_note" | "ecommerce" | "manual" | "portal" | "pos";
};

export async function resolveCurrentPayableInvoice(input: {
  findByReference: (reference: string) => Promise<InvoiceWithLines | null>;
  invoice: InvoiceWithLines;
}): Promise<InvoiceWithLines> {
  const currentPayableReference = input.invoice.currentPayableReference;

  if (
    currentPayableReference &&
    currentPayableReference !== input.invoice.reference
  ) {
    const currentPayableInvoice = await input.findByReference(
      currentPayableReference,
    );

    if (!currentPayableInvoice) {
      throw new InvalidReturnError(
        "The latest payable invoice revision could not be resolved.",
        {
          currentPayableReference,
          reference: input.invoice.reference,
        },
      );
    }

    return currentPayableInvoice;
  }

  let currentInvoice = input.invoice;
  const seenReferences = new Set<string>();

  while (currentInvoice.replacementInvoiceReference) {
    if (seenReferences.has(currentInvoice.reference)) {
      throw new InvalidReturnError(
        "Invoice revision chain contains a cycle and cannot be processed.",
        { reference: currentInvoice.reference },
      );
    }

    seenReferences.add(currentInvoice.reference);

    const replacementInvoice = await input.findByReference(
      currentInvoice.replacementInvoiceReference,
    );

    if (!replacementInvoice) {
      throw new InvalidReturnError(
        "The latest payable invoice revision could not be resolved.",
        {
          reference: currentInvoice.reference,
          replacementReference: currentInvoice.replacementInvoiceReference,
        },
      );
    }

    currentInvoice = replacementInvoice;
  }

  return currentInvoice;
}

export async function resolveCurrentPayableReference(input: {
  findByReference: (
    reference: string,
  ) => Promise<InvoiceLifecycleReference | null>;
  invoice: InvoiceLifecycleReference;
}): Promise<string | null> {
  if (input.invoice.type === "credit_note") {
    const startReference =
      input.invoice.replacementInvoiceReference ??
      input.invoice.revisionRootReference ??
      input.invoice.parentInvoiceReference ??
      null;

    if (!startReference) return null;

    return resolveLatestPayableReference({
      findByReference: input.findByReference,
      reference: startReference,
    });
  }

  return resolveLatestPayableReference({
    findByReference: input.findByReference,
    reference: input.invoice.reference,
  });
}

export async function resolveLatestPayableReference(input: {
  findByReference: (
    reference: string,
  ) => Promise<InvoiceLifecycleReference | null>;
  reference: string;
}): Promise<string | null> {
  let currentReference: string | null = input.reference;
  const seenReferences = new Set<string>();

  while (currentReference) {
    if (seenReferences.has(currentReference)) return null;

    const activeReference = currentReference;
    seenReferences.add(activeReference);
    const invoice = await input.findByReference(activeReference);

    if (!invoice) return null;

    if (!invoice.replacementInvoiceReference) {
      return invoice.type !== "credit_note" && invoice.status === "confirmed"
        ? invoice.reference
        : null;
    }

    currentReference = invoice.replacementInvoiceReference;
  }

  return null;
}
