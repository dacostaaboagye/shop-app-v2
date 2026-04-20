import type {
  InvoiceResponse,
  IssuedDocumentSnapshotResponse,
  OfficialDocumentProfileResponse,
} from "@shop/contracts";
import {
  formatLabel,
  formatMoney,
  toPdfColor,
} from "./sales-issued-document-pdf.support.js";

type RenderInput = {
  invoice: InvoiceResponse;
  profile: OfficialDocumentProfileResponse;
  snapshot: IssuedDocumentSnapshotResponse;
  title: string;
};

export function renderSalesIssuedDocumentPdf(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
): void {
  const primary = toPdfColor(input.profile.primaryColor, "#1c5c57");
  const accent = toPdfColor(input.profile.accentColor, "#d87422");

  drawPageShell(doc, primary, accent);
  drawHeader(doc, input, primary);
  drawMeta(doc, input);
  const tableEndY = drawLineItems(doc, input, 250);
  const totalsEndY = drawTotals(
    doc,
    input,
    Math.max(tableEndY + 18, 408),
    primary,
  );
  drawFooter(doc, input, totalsEndY);
}

function drawPageShell(
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
  input: RenderInput,
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

  doc.roundedRect(390, 55, 150, 76, 4).strokeColor("#d8d0c8").stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(12);
  doc.text(input.title.toUpperCase(), 405, 70, { align: "right", width: 120 });
  doc.fillColor("#15110f").fontSize(10);
  doc.text(input.invoice.reference, 405, 91, { align: "right", width: 120 });
  doc.fillColor("#6f665f").font("Helvetica-Bold").fontSize(8);
  doc.text(input.invoice.status.toUpperCase(), 405, 110, {
    align: "right",
    width: 120,
  });
}

function drawMeta(doc: PDFKit.PDFDocument, input: RenderInput): void {
  const issuedAt = new Date(
    input.invoice.confirmedAt ?? input.invoice.createdAt,
  ).toLocaleString(input.profile.locale, { timeZone: input.profile.timezone });
  const rows: Array<[string, string]> = [
    ["Issued at", issuedAt],
    ["Payment", formatLabel(input.invoice.paymentMethod ?? "not recorded")],
    ["Currency", input.profile.currencyCode],
    ["Tax number", input.profile.taxNumber],
    ["Registration", input.profile.registrationNumber],
  ];

  doc.roundedRect(42, 154, 498, 56, 4).fill("#f4f0ea");
  rows.forEach(([label, value], index) => {
    const x = 58 + index * 96;
    doc.fillColor("#716860").font("Helvetica-Bold").fontSize(7.5);
    doc.text(label.toUpperCase(), x, 170, { width: 82 });
    doc.fillColor("#15110f").font("Helvetica").fontSize(8.5);
    doc.text(value, x, 184, { width: 82 });
  });
}

function drawLineItems(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  startY: number,
): number {
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(12);
  doc.text("Line Items", 42, startY - 28);
  drawTableHeader(doc, startY);

  let y = startY + 28;
  input.invoice.lines.forEach((line, index) => {
    if (index % 2 === 0) doc.rect(42, y - 8, 498, 34).fill("#fbfaf8");
    doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(9);
    doc.text(line.skuSnapshot.productName, 54, y, { width: 220 });
    doc.fillColor("#6f665f").font("Helvetica").fontSize(7.5);
    doc.text(
      `${line.skuSnapshot.variantName} . ${line.skuSnapshot.sku}`,
      54,
      y + 12,
      { width: 220 },
    );
    doc.fillColor("#15110f").font("Helvetica").fontSize(9);
    doc.text(String(line.quantity), 318, y, { align: "right", width: 42 });
    doc.text(formatMoney(line.unitPrice, input.profile), 382, y, {
      align: "right",
      width: 62,
    });
    doc
      .font("Helvetica-Bold")
      .text(formatMoney(line.lineTotal, input.profile), 462, y, {
        align: "right",
        width: 66,
      });
    y += 40;
  });

  doc
    .moveTo(42, y - 4)
    .lineTo(540, y - 4)
    .strokeColor("#d8d0c8")
    .stroke();
  return y;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): void {
  doc.rect(42, y - 4, 498, 24).fill("#15110f");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
  doc.text("ITEM", 54, y + 4);
  doc.text("QTY", 318, y + 4, { align: "right", width: 42 });
  doc.text("UNIT", 382, y + 4, { align: "right", width: 62 });
  doc.text("TOTAL", 462, y + 4, { align: "right", width: 66 });
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  y: number,
  primary: string,
): number {
  doc.roundedRect(332, y, 208, 88, 4).fill("#eef7f5");
  drawTotalRow(
    doc,
    "Subtotal",
    formatMoney(input.invoice.subtotalAmount, input.profile),
    y + 16,
  );
  drawTotalRow(
    doc,
    "Tax",
    formatMoney(input.invoice.taxAmount, input.profile),
    y + 34,
  );
  doc
    .moveTo(352, y + 56)
    .lineTo(520, y + 56)
    .strokeColor("#c9ddd9")
    .stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(8.5);
  doc.text("TOTAL DUE", 352, y + 64);
  doc.fillColor("#15110f").fontSize(16);
  doc.text(formatMoney(input.invoice.totalAmount, input.profile), 412, y + 60, {
    align: "right",
    width: 108,
  });
  return y + 88;
}

function drawTotalRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  y: number,
): void {
  doc.fillColor("#5d6764").font("Helvetica").fontSize(8.5);
  doc.text(label, 352, y);
  doc.fillColor("#15110f").text(value, 412, y, { align: "right", width: 108 });
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  y: number,
): void {
  const footerY = Math.max(608, Math.min(y + 28, 626));
  doc.roundedRect(42, footerY, 498, 104, 4).fill("#fbfaf8");
  doc.roundedRect(42, footerY, 498, 104, 4).strokeColor("#d8d0c8").stroke();
  doc
    .rect(42, footerY, 4, 104)
    .fill(toPdfColor(input.profile.accentColor, "#d87422"));

  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(8.5);
  doc.text(input.profile.footer, 58, footerY + 16, {
    height: 34,
    width: 292,
  });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(7.5);
  doc.text(
    `${input.profile.phone} | ${input.profile.email} | ${input.profile.website}`,
    58,
    footerY + 60,
    { width: 292 },
  );
  doc.text(input.profile.addressLines.join(", "), 58, footerY + 74, {
    width: 292,
  });

  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(7.5);
  doc.text("DOCUMENT EVIDENCE", 370, footerY + 16, {
    align: "right",
    width: 150,
  });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(6.6);
  doc.text(input.snapshot.contentHash, 370, footerY + 32, {
    align: "right",
    height: 28,
    width: 150,
  });
  doc.text(input.snapshot.schemaVersion, 370, footerY + 74, {
    align: "right",
    width: 150,
  });
}
