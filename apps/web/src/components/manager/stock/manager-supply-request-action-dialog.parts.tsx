import { AppFormField } from "@/components/forms/app-form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import type { ResolveTarget } from "./manager-supply-requests.support";

export function ApprovedQuantityField({
  approvedQty,
  approvedQtyId,
  setApprovedQty,
}: {
  approvedQty: string;
  approvedQtyId: string;
  setApprovedQty: (value: string) => void;
}) {
  return (
    <AppFormField
      description="Confirm the actual quantity the source location can release for this transfer."
      inputId={approvedQtyId}
      label="Quantity you can send"
    >
      <Input
        id={approvedQtyId}
        inputMode="numeric"
        min={1}
        onChange={(event) => setApprovedQty(event.target.value)}
        required
        type="number"
        value={approvedQty}
      />
    </AppFormField>
  );
}

export function NotesField({
  action,
  notes,
  notesId,
  setNotes,
}: {
  action: ResolveTarget["action"] | undefined;
  notes: string;
  notesId: string;
  setNotes: (value: string) => void;
}) {
  return (
    <AppFormField
      description={
        action === "dispatch"
          ? "Record anything the receiving location should know about this shipment."
          : "Keep the note brief and operational so the requester can act on it."
      }
      inputId={notesId}
      label={
        action === "dispatch"
          ? "Dispatch notes (optional)"
          : "Note to worker (optional)"
      }
    >
      <Textarea
        id={notesId}
        maxLength={500}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={
          action === "dispatch"
            ? "Any notes about this shipment..."
            : "Reason or additional context..."
        }
        rows={3}
        value={notes}
      />
    </AppFormField>
  );
}

export function MutationErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-destructive">
      {getAppErrorMessage(error, { fallbackDetail: "Something went wrong." })}
    </p>
  );
}

export function isValidApprovedQuantity(value: string) {
  const quantity = parseInt(value, 10);
  return Number.isInteger(quantity) && quantity > 0;
}

export function getActionTitle(action: ResolveTarget["action"] | undefined) {
  if (action === "approve") return "Approve request";
  if (action === "dispatch") return "Dispatch goods";
  return "Reject request";
}

export function getSubmitLabel(action: ResolveTarget["action"] | undefined) {
  if (action === "approve") return "Approve";
  if (action === "dispatch") return "Dispatch";
  return "Reject";
}
