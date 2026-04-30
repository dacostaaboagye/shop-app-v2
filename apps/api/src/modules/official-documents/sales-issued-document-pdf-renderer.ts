import type {
  InvoiceResponse,
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
  formatMoney,
  toPdfColor,
} from "./sales-issued-document-pdf.support.js";

type RenderInput = {
  invoice: InvoiceResponse;
  profile: OfficialDocumentProfileResponse;
  snapshot: IssuedDocumentSnapshotResponse;
  title: string;
};

export async function renderSalesIssuedDocumentPdf(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
): Promise<void> {
  const primary = toPdfColor(input.profile.primaryColor, "#1c5c57");
  const accent = toPdfColor(input.profile.accentColor, "#d87422");

  drawDocumentShell(doc);
  await drawHeader(doc, input, primary);
  const headerContentEndY = drawCustomerAndMeta(doc, input, primary);
  const tableEndY = drawLineItems(doc, input, headerContentEndY + 32);
  const totalsEndY = drawTotals(
    doc,
    input,
    Math.max(tableEndY + 18, 498),
    primary,
  );
  drawFooter(doc, input, totalsEndY, accent);
}

async function drawHeader(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  primary: string,
): Promise<void> {
  await drawDocumentHero(doc, {
    accent: toPdfColor(input.profile.accentColor, "#d87422"),
    primary,
    profile: input.profile,
    reference: input.invoice.reference,
    status: input.invoice.status,
    title: input.title,
  });
}

function drawCustomerAndMeta(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  primary: string,
): number {
  const customerEndY = drawCustomerBlock(doc, input);
  const metaEndY = drawMetaBlock(doc, input, primary);

  return Math.max(customerEndY, metaEndY);
}

function drawCustomerBlock(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
): number {
  const customerName =
    input.invoice.customerName ??
    (input.invoice.type === "pos" ? "Walk-in customer" : "Customer account");
  const addressLines = input.invoice.customerBillingAddressLines ?? [];
  const contactLines = [
    input.invoice.customerEmail,
    input.invoice.customerPhone,
    input.invoice.customerTaxNumber
      ? `Tax: ${input.invoice.customerTaxNumber}`
      : null,
  ].filter(Boolean);

  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(9);
  doc.text("CUSTOMER", 42, 224);
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(10);
  doc.text(customerName, 42, 242, { width: 224 });
  doc.fillColor("#6f665f").font("Helvetica").fontSize(8.5);
  const detailLines = [...addressLines, ...contactLines];
  const detailText = detailLines.join("\n") || "No customer details captured.";
  const detailHeight = doc.heightOfString(detailText, {
    width: 224,
  });
  doc.text(detailText, 42, 258, {
    width: 224,
  });

  return 258 + detailHeight;
}

function drawMetaBlock(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  primary: string,
): number {
  const issuedAt = new Date(
    input.invoice.confirmedAt ?? input.invoice.createdAt,
  ).toLocaleString(input.profile.locale, { timeZone: input.profile.timezone });
  const rows: Array<[string, string]> = [
    ["Issued", issuedAt],
    ["Payment", formatLabel(input.invoice.paymentMethod ?? "not recorded")],
    ["Currency", input.profile.currencyCode],
    ["Reference", input.invoice.reference],
  ];

  rows.forEach(([label, value], index) => {
    const y = 224 + index * 28;
    doc.rect(300, y, 112, 22).fill(primary);
    doc.rect(422, y, 118, 22).fill("#f6f7f4");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5);
    doc.text(label.toUpperCase(), 310, y + 7, { width: 92 });
    doc.fillColor("#15110f").font("Helvetica").fontSize(8);
    doc.text(value, 432, y + 7, { width: 96 });
  });

  return 224 + rows.length * 28;
}

function drawLineItems(
  doc: PDFKit.PDFDocument,
  input: RenderInput,
  startY: number,
): number {
  drawSectionTitle(doc, "Line Items", 42, startY - 28);
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
    doc.text("Each", 282, y, { width: 52 });
    doc.text(String(line.quantity), 344, y, { align: "right", width: 52 });
    doc.text(formatMoney(line.unitPrice, input.profile), 406, y, {
      align: "right",
      width: 62,
    });
    doc
      .font("Helvetica-Bold")
      .text(formatMoney(line.lineTotal, input.profile), 474, y, {
        align: "right",
        width: 54,
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
  doc.text("SERVICE", 54, y + 4);
  doc.text("UNIT", 282, y + 4, { width: 52 });
  doc.text("QUANTITY", 344, y + 4, { align: "right", width: 52 });
  doc.text("RATE", 406, y + 4, { align: "right", width: 62 });
  doc.text("TOTAL", 474, y + 4, { align: "right", width: 54 });
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
  accent: string,
): void {
  const footerY = Math.max(650, Math.min(y + 28, 674));
  drawPdfFooter(
    doc,
    input.profile,
    input.snapshot.contentHash,
    input.snapshot.schemaVersion,
    footerY,
    accent,
  );
}
