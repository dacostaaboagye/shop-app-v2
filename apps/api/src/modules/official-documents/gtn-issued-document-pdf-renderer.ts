import type {
  GtnResponse,
  IssuedDocumentSnapshotResponse,
  OfficialDocumentProfileResponse,
} from "@shop/contracts";
import {
  formatLabel,
  toPdfColor,
} from "./sales-issued-document-pdf.support.js";

type RenderInput = {
  gtn: GtnResponse;
  profile: OfficialDocumentProfileResponse;
  snapshot: IssuedDocumentSnapshotResponse;
};

export function renderGtnIssuedDocumentPdf(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
): void {
  const primary = toPdfColor(input.profile.primaryColor, "#1c5c57");
  const accent = toPdfColor(input.profile.accentColor, "#d87422");
  drawShell(doc, primary, accent);
  drawHeader(doc, input, primary);
  drawRoute(doc, input, primary);
  drawGoods(doc, input);
  drawHandover(doc, input, primary);
  drawFooter(doc, input, accent);
}

function drawShell(
  doc: PDFKit.PDFDocument,
  primary: string,
  accent: string,
): void {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fbfaf8");
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).fill("#ffffff");
  doc.rect(24, 24, doc.page.width - 48, 10).fill(primary);
  doc.rect(24, 34, doc.page.width - 48, 3).fill(accent);
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "gtn" | "profile">,
  primary: string,
): void {
  doc.roundedRect(42, 58, 46, 46, 3).fill(primary);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15);
  doc.text(input.profile.logoText, 42, 73, { align: "center", width: 46 });
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(22);
  doc.text(input.profile.brandName.toUpperCase(), 104, 55, { width: 250 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(9.5);
  doc.text(input.profile.legalName, 104, 82, { width: 270 });
  doc.text(input.profile.addressLines.join(", "), 104, 96, { width: 270 });
  doc.roundedRect(390, 55, 150, 80, 4).strokeColor("#d8d0c8").stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(12);
  doc.text("GOODS TRANSFER NOTE", 405, 70, {
    align: "right",
    width: 120,
  });
  doc.fillColor("#15110f").fontSize(10);
  doc.text(input.gtn.reference, 405, 94, { align: "right", width: 120 });
  doc.fillColor("#6f665f").font("Helvetica-Bold").fontSize(8);
  doc.text(formatLabel(input.gtn.status).toUpperCase(), 405, 114, {
    align: "right",
    width: 120,
  });
}

function drawRoute(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "gtn" | "profile">,
  primary: string,
): void {
  const dispatchedAt = new Date(input.gtn.dispatchedAt).toLocaleString(
    input.profile.locale,
    { timeZone: input.profile.timezone },
  );
  const receivedAt = input.gtn.receivedAt
    ? new Date(input.gtn.receivedAt).toLocaleString(input.profile.locale, {
        timeZone: input.profile.timezone,
      })
    : "Pending receipt";

  doc.roundedRect(42, 158, 498, 96, 4).fill("#f4f0ea");
  drawMetaValue(
    doc,
    "Source",
    input.gtn.sourceLocationName ?? "Source",
    58,
    176,
  );
  drawMetaValue(
    doc,
    "Destination",
    input.gtn.destinationLocationName ?? "Destination",
    228,
    176,
  );
  drawMetaValue(
    doc,
    "Supply request",
    input.gtn.supplyRequestReference,
    398,
    176,
  );
  drawMetaValue(doc, "Dispatched", dispatchedAt, 58, 218);
  drawMetaValue(doc, "Received", receivedAt, 228, 218);
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(9);
  doc.text(
    input.gtn.status === "dispatched" ? "IN TRANSIT" : "RECEIVED",
    398,
    218,
    { align: "right", width: 120 },
  );
}

function drawGoods(doc: PDFKit.PDFDocument, input: Pick<RenderInput, "gtn">) {
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(12);
  doc.text("Transferred goods", 42, 292);
  doc.rect(42, 318, 498, 24).fill("#15110f");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
  doc.text("ITEM", 54, 326);
  doc.text("SKU", 300, 326);
  doc.text("QTY", 474, 326, { align: "right", width: 48 });
  doc.rect(42, 342, 498, 48).fill("#fbfaf8");
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(10);
  doc.text(input.gtn.skuSnapshot.productName, 54, 356, { width: 220 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(8);
  doc.text(input.gtn.skuSnapshot.variantName, 54, 370, { width: 220 });
  doc.fillColor("#15110f").fontSize(9);
  doc.text(input.gtn.skuSnapshot.sku, 300, 360, { width: 120 });
  doc.font("Helvetica-Bold").text(String(input.gtn.quantity), 474, 360, {
    align: "right",
    width: 48,
  });
}

function drawHandover(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "gtn">,
  primary: string,
): void {
  doc.roundedRect(42, 426, 498, 118, 4).strokeColor("#d8d0c8").stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(10);
  doc.text("Operational handover", 58, 446);
  drawSignatureBlock(
    doc,
    "Dispatched by",
    input.gtn.dispatchedByName ?? input.gtn.dispatchedBy,
    58,
    476,
  );
  drawSignatureBlock(
    doc,
    "Received by",
    input.gtn.receivedByName ?? "Pending receipt",
    300,
    476,
  );
  if (input.gtn.notes) {
    doc.fillColor("#6f665f").font("Helvetica").fontSize(8);
    doc.text(`Notes: ${input.gtn.notes}`, 58, 526, { width: 440 });
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "profile" | "snapshot">,
  accent: string,
): void {
  doc.roundedRect(42, 612, 498, 104, 4).fill("#fbfaf8");
  doc.roundedRect(42, 612, 498, 104, 4).strokeColor("#d8d0c8").stroke();
  doc.rect(42, 612, 4, 104).fill(accent);
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(8.5);
  doc.text(input.profile.footer, 58, 628, { height: 34, width: 292 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(7.5);
  doc.text(
    `${input.profile.phone} | ${input.profile.email} | ${input.profile.website}`,
    58,
    672,
    { width: 292 },
  );
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(7.5);
  doc.text("DOCUMENT EVIDENCE", 370, 628, { align: "right", width: 150 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(6.6);
  doc.text(input.snapshot.contentHash, 370, 644, {
    align: "right",
    height: 28,
    width: 150,
  });
  doc.text(input.snapshot.schemaVersion, 370, 686, {
    align: "right",
    width: 150,
  });
}

function drawMetaValue(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc.fillColor("#716860").font("Helvetica-Bold").fontSize(7.5);
  doc.text(label.toUpperCase(), x, y, { width: 130 });
  doc.fillColor("#15110f").font("Helvetica").fontSize(8.5);
  doc.text(value, x, y + 14, { width: 130 });
}

function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
): void {
  doc.fillColor("#716860").font("Helvetica-Bold").fontSize(7.5);
  doc.text(label.toUpperCase(), x, y);
  doc.fillColor("#15110f").font("Helvetica").fontSize(9);
  doc.text(value, x, y + 16, { width: 190 });
  doc
    .moveTo(x, y + 44)
    .lineTo(x + 190, y + 44)
    .strokeColor("#d8d0c8")
    .stroke();
}
