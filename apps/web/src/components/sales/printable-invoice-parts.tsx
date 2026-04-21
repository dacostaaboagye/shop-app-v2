import Image from "next/image";
import type { OfficialDocumentProfile } from "@/lib/documents/official-document-profile";

const SEP = "- - - - - - - - - - - - - - - - - -";

export function PrintableBrandMark({
  profile,
}: {
  profile: OfficialDocumentProfile;
}) {
  if (profile.logoImageUrl) {
    return (
      <Image
        alt={`${profile.brandName} logo`}
        height={36}
        src={profile.logoImageUrl}
        style={{
          height: "36px",
          objectFit: "cover",
          width: "36px",
        }}
        unoptimized
        width={36}
      />
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: profile.primaryColor,
        color: "white",
        display: "flex",
        fontSize: "13px",
        fontWeight: "bold",
        height: "36px",
        justifyContent: "center",
        letterSpacing: "1px",
        width: "36px",
      }}
    >
      {profile.logoText}
    </div>
  );
}

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
