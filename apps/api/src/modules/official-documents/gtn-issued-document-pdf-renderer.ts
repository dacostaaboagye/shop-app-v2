import type {
  GtnResponse,
  IssuedDocumentSnapshotResponse,
  OfficialDocumentProfileResponse,
} from "@shop/contracts";
import {
  drawDocumentHero,
  drawDocumentShell,
  drawPdfFooter,
  drawSectionTitle,
} from "./official-document-pdf-layout.js";
import {
  formatLabel,
  toPdfColor,
} from "./sales-issued-document-pdf.support.js";

type RenderInput = {
  gtn: GtnResponse;
  profile: OfficialDocumentProfileResponse;
  snapshot: IssuedDocumentSnapshotResponse;
};

export async function renderGtnIssuedDocumentPdf(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
): Promise<void> {
  const primary = toPdfColor(input.profile.primaryColor, "#1c5c57");
  const accent = toPdfColor(input.profile.accentColor, "#d87422");
  drawDocumentShell(doc);
  await drawHeader(doc, input, primary);
  drawRoute(doc, input, primary);
  drawGoods(doc, input);
  drawHandover(doc, input, primary);
  drawFooter(doc, input, accent);
}

async function drawHeader(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "gtn" | "profile">,
  primary: string,
): Promise<void> {
  await drawDocumentHero(doc, {
    accent: toPdfColor(input.profile.accentColor, "#d87422"),
    primary,
    profile: input.profile,
    reference: input.gtn.reference,
    status: formatLabel(input.gtn.status),
    statusSuffix: null,
    title: "Goods Transfer Note",
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

  doc.roundedRect(42, 224, 498, 96, 4).fill("#f4f0ea");
  drawMetaValue(
    doc,
    "Source",
    input.gtn.sourceLocationName ?? "Source",
    58,
    242,
  );
  drawMetaValue(
    doc,
    "Destination",
    input.gtn.destinationLocationName ?? "Destination",
    228,
    242,
  );
  drawMetaValue(
    doc,
    "Supply request",
    input.gtn.supplyRequestReference,
    398,
    242,
  );
  drawMetaValue(doc, "Dispatched", dispatchedAt, 58, 284);
  drawMetaValue(doc, "Received", receivedAt, 228, 284);
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(9);
  doc.text(
    input.gtn.status === "dispatched" ? "IN TRANSIT" : "RECEIVED",
    398,
    284,
    { align: "right", width: 120 },
  );
}

function drawGoods(doc: PDFKit.PDFDocument, input: Pick<RenderInput, "gtn">) {
  drawSectionTitle(doc, "Transferred goods", 42, 356);
  doc.rect(42, 382, 498, 24).fill("#15110f");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
  doc.text("ITEM", 54, 390);
  doc.text("SKU", 300, 390);
  doc.text("QTY", 474, 390, { align: "right", width: 48 });
  doc.rect(42, 406, 498, 48).fill("#fbfaf8");
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(10);
  doc.text(input.gtn.skuSnapshot.productName, 54, 420, { width: 220 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(8);
  doc.text(input.gtn.skuSnapshot.variantName, 54, 434, { width: 220 });
  doc.fillColor("#15110f").fontSize(9);
  doc.text(input.gtn.skuSnapshot.sku, 300, 424, { width: 120 });
  doc.font("Helvetica-Bold").text(String(input.gtn.quantity), 474, 424, {
    align: "right",
    width: 48,
  });
}

function drawHandover(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "gtn">,
  primary: string,
): void {
  doc.roundedRect(42, 492, 498, 118, 4).strokeColor("#d8d0c8").stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(10);
  doc.text("Operational handover", 58, 512);
  drawSignatureBlock(
    doc,
    "Dispatched by",
    input.gtn.dispatchedByName ?? input.gtn.dispatchedBy,
    58,
    542,
  );
  drawSignatureBlock(
    doc,
    "Received by",
    input.gtn.receivedByName ?? "Pending receipt",
    300,
    542,
  );
  if (input.gtn.notes) {
    doc.fillColor("#6f665f").font("Helvetica").fontSize(8);
    doc.text(`Notes: ${input.gtn.notes}`, 58, 592, { width: 440 });
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  input: Pick<RenderInput, "profile" | "snapshot">,
  accent: string,
): void {
  drawPdfFooter(
    doc,
    input.profile,
    input.snapshot.contentHash,
    input.snapshot.schemaVersion,
    650,
    accent,
  );
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
