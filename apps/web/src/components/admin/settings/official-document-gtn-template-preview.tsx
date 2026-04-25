import type { OfficialDocumentSettingsFormValues } from "./official-document-settings-form.support";

export function OfficialDocumentGtnTemplatePreview({
  primaryColor,
}: {
  primaryColor: string;
  values: OfficialDocumentSettingsFormValues;
}) {
  return (
    <div className="flex flex-col gap-8">
      <TransferRouteCard primaryColor={primaryColor} />
      <TransferredGoodsTable />
      <OperationalHandover primaryColor={primaryColor} />
    </div>
  );
}

function TransferRouteCard({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <div className="grid gap-5 sm:grid-cols-3">
        <RouteValue label="Source" value="Main warehouse" />
        <RouteValue label="Destination" value="Airport branch" />
        <RouteValue label="Supply request" value="SR-000118" />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <RouteValue label="Dispatched" value="04/21/2026, 09:30" />
        <RouteValue label="Received" value="Pending receipt" />
        <div className="text-left sm:text-right">
          <p className="type-data-label">Status</p>
          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: primaryColor }}
          >
            In transit
          </p>
        </div>
      </div>
    </div>
  );
}

function RouteValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="type-data-label">{label}</p>
      <p className="mt-2 text-pretty text-sm text-foreground">{value}</p>
    </div>
  );
}

function TransferredGoodsTable() {
  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-foreground">
        Transferred goods
      </p>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border bg-foreground text-left text-xs text-background">
            <th className="px-3 py-3 font-medium">Item</th>
            <th className="w-36 px-3 py-3 font-medium">SKU</th>
            <th className="w-20 px-3 py-3 text-right font-medium">Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/70 bg-muted/20">
            <td className="px-3 py-3">
              <p className="font-medium text-foreground">
                Transferred stock item
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Carton pack</p>
            </td>
            <td className="px-3 py-3 text-muted-foreground">STK-TRANSFER</td>
            <td className="px-3 py-3 text-right font-semibold tabular-nums">
              24
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function OperationalHandover({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/15 p-4">
      <p className="text-sm font-semibold" style={{ color: primaryColor }}>
        Operational handover
      </p>
      <div className="mt-5 grid gap-8 sm:grid-cols-2">
        <SignatureValue label="Dispatched by" value="Warehouse manager" />
        <SignatureValue label="Received by" value="Pending receipt" />
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Notes: Keep cartons sealed until the destination manager receives the
        transfer.
      </p>
    </div>
  );
}

function SignatureValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="type-data-label">{label}</p>
      <p className="mt-3 text-pretty text-sm text-foreground">{value}</p>
      <div className="mt-5 border-t border-border" />
    </div>
  );
}
