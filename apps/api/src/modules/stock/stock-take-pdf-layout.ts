import type { StockTakeLine } from "@shop/contracts";

export const STOCK_TAKE_PDF_PAGE = {
  bottom: 760,
  left: 42,
  right: 553,
  tableTop: 196,
  top: 42,
};

export function renderStockTakePdfTable(
  doc: PDFKit.PDFDocument,
  input: {
    columns: readonly (readonly [string, number])[];
    lines: StockTakeLine[];
    row: (line: StockTakeLine) => string[];
  },
): void {
  let y = STOCK_TAKE_PDF_PAGE.tableTop;
  drawTableHeader(doc, input.columns, y);
  y += 22;
  for (const line of input.lines) {
    if (y > STOCK_TAKE_PDF_PAGE.bottom) {
      doc.addPage();
      y = STOCK_TAKE_PDF_PAGE.top;
      drawTableHeader(doc, input.columns, y);
      y += 22;
    }
    drawTableRow(doc, input.columns, input.row(line), y);
    y += 20;
  }
}

export function drawStockTakeSignatureArea(doc: PDFKit.PDFDocument): void {
  const y = Math.min(doc.y + 34, STOCK_TAKE_PDF_PAGE.bottom - 58);
  ["Counted by", "Reviewed by", "Approved by"].forEach((label, index) => {
    const x = STOCK_TAKE_PDF_PAGE.left + index * 170;
    doc.roundedRect(x, y, 152, 54, 3).strokeColor("#d8d0c8").stroke();
    doc.fillColor("#6f665f").font("Helvetica-Bold").fontSize(7.5);
    doc.text(label, x + 8, y + 8);
    doc
      .moveTo(x + 8, y + 34)
      .lineTo(x + 144, y + 34)
      .stroke();
  });
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  columns: readonly (readonly [string, number])[],
  y: number,
): void {
  doc
    .roundedRect(
      STOCK_TAKE_PDF_PAGE.left,
      y,
      STOCK_TAKE_PDF_PAGE.right - STOCK_TAKE_PDF_PAGE.left,
      18,
      2,
    )
    .fill("#e9ece4");
  doc.fillColor("#15110f").font("Helvetica-Bold").fontSize(7.5);
  drawCells(
    doc,
    columns,
    columns.map(([label]) => label),
    y + 5,
  );
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  columns: readonly (readonly [string, number])[],
  values: string[],
  y: number,
): void {
  doc
    .moveTo(STOCK_TAKE_PDF_PAGE.left, y + 17)
    .lineTo(STOCK_TAKE_PDF_PAGE.right, y + 17)
    .strokeColor("#d8d0c8")
    .stroke();
  doc.fillColor("#15110f").font("Helvetica").fontSize(7.3);
  drawCells(doc, columns, values, y + 4);
}

function drawCells(
  doc: PDFKit.PDFDocument,
  columns: readonly (readonly [string, number])[],
  values: string[],
  y: number,
): void {
  let x = STOCK_TAKE_PDF_PAGE.left + 4;
  columns.forEach(([, width], index) => {
    doc.text(values[index] ?? "", x, y, { ellipsis: true, width: width - 5 });
    x += width;
  });
}
