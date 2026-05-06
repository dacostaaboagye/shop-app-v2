import type { OfficialDocumentProfileResponse } from "@shop/contracts";
import { getOfficialDocumentLogoImage } from "./official-document-logo-fetch.js";

type HeroInput = {
  accent: string;
  primary: string;
  profile: OfficialDocumentProfileResponse;
  reference: string;
  status: string;
  statusSuffix?: string | null;
  title: string;
};

export function drawDocumentShell(doc: PDFKit.PDFDocument): void {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f6f7f4");
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).fill("#ffffff");
}

export async function drawDocumentHero(
  doc: PDFKit.PDFDocument,
  input: HeroInput,
): Promise<void> {
  const { accent, primary, profile, reference, status, title } = input;

  doc.save();
  doc.moveTo(24, 24).lineTo(320, 24).lineTo(264, 154).lineTo(24, 204);
  doc.closePath().fill(primary);
  doc
    .moveTo(302, 24)
    .lineTo(356, 24)
    .lineTo(332, 176)
    .lineTo(282, 176)
    .closePath()
    .fill(accent);
  doc.restore();

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16);
  doc.text(reference, 42, 76, { width: 220 });
  doc.font("Helvetica").fontSize(8.5);
  doc.text(title, 42, 104, { width: 220 });
  doc.rect(42, 142, 82, 3).fill("#ffffff");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
  doc.text(
    getHeroStatusText({
      currencyCode: profile.currencyCode,
      status,
      statusSuffix: input.statusSuffix,
    }),
    42,
    154,
    { width: 180 },
  );

  await drawLogoMark(doc, profile, primary);
  drawCenteredFitText(doc, profile.legalName.toUpperCase(), 352, 116, 226, {
    font: "Helvetica-Bold",
    maxSize: 14,
    minSize: 9,
  });
  doc.fillColor("#5f6561").font("Helvetica").fontSize(8.5);
  doc.text(`${profile.locale} - ${profile.timezone}`, 352, 136, {
    align: "center",
    width: 226,
  });
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(8);
  doc.text(`VAT: ${profile.taxNumber}`, 352, 158, {
    align: "center",
    width: 226,
  });
}

export function getHeroStatusText({
  currencyCode,
  status,
  statusSuffix,
}: {
  currencyCode: string;
  status: string;
  statusSuffix?: string | null | undefined;
}) {
  const suffix = statusSuffix === undefined ? currencyCode : statusSuffix;
  return suffix ? `${status.toUpperCase()} | ${suffix}` : status.toUpperCase();
}

async function drawLogoMark(
  doc: PDFKit.PDFDocument,
  profile: OfficialDocumentProfileResponse,
  primary: string,
): Promise<void> {
  const x = 452;
  const y = 58;
  const size = 42;
  const image = await getOfficialDocumentLogoImage(profile.logoImageUrl);

  if (image) {
    doc.roundedRect(x, y, size, size, 3).fill("#ffffff");
    doc.roundedRect(x, y, size, size, 3).strokeColor("#d8d0c8").stroke();
    try {
      doc.image(image, x + 4, y + 4, {
        align: "center",
        fit: [size - 8, size - 8],
        valign: "center",
      });
      return;
    } catch {
      // Unsupported formats should not block document generation.
    }
  }

  doc.roundedRect(x, y, size, size, 3).fill(primary);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12);
  doc.text(profile.logoText, x, y + 14, { align: "center", width: size });
}

function drawCenteredFitText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: {
    font: string;
    maxSize: number;
    minSize: number;
  },
): void {
  let fontSize = options.maxSize;
  doc.font(options.font).fontSize(fontSize);

  while (fontSize > options.minSize && doc.widthOfString(text) > width) {
    fontSize -= 0.5;
    doc.fontSize(fontSize);
  }

  doc.fillColor("#15110f").text(text, x, y, {
    align: "center",
    lineBreak: false,
    width,
  });
}

export function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  x: number,
  y: number,
): void {
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(12);
  doc.text(title, x, y);
}

export function drawPdfFooter(
  doc: PDFKit.PDFDocument,
  profile: OfficialDocumentProfileResponse,
  contentHash: string,
  schemaVersion: string,
  y: number,
  accent: string,
): void {
  doc.roundedRect(42, y, 498, 104, 4).fill("#f6f7f4");
  doc.roundedRect(42, y, 498, 104, 4).strokeColor("#d8d0c8").stroke();
  doc.rect(42, y, 4, 104).fill(accent);
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(8.5);
  doc.text(profile.footer, 58, y + 16, { height: 34, width: 292 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(7.5);
  doc.text(
    `${profile.phone} | ${profile.email} | ${profile.website}`,
    58,
    y + 60,
    {
      width: 292,
    },
  );
  doc.text(profile.addressLines.join(", "), 58, y + 74, { width: 292 });
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(7.5);
  doc.text("DOCUMENT EVIDENCE", 370, y + 16, {
    align: "right",
    width: 150,
  });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(6.6);
  doc.text(contentHash, 370, y + 32, {
    align: "right",
    height: 28,
    width: 150,
  });
  doc.text(schemaVersion, 370, y + 74, { align: "right", width: 150 });
}
