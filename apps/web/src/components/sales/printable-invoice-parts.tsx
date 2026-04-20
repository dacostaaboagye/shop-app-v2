const SEP = "- - - - - - - - - - - - - - - - - -";

export function PrintableSeparator() {
  return (
    <p
      style={{
        color: "dimgray",
        fontSize: "10px",
        margin: "0 0 8px",
        textAlign: "center",
      }}
    >
      {SEP}
    </p>
  );
}

export function PrintableRow({
  label,
  value,
  bold,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: large ? "14px" : "12px",
        fontWeight: bold ? "bold" : "normal",
        gap: "8px",
        justifyContent: "space-between",
        marginBottom: large ? "2px" : "0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
