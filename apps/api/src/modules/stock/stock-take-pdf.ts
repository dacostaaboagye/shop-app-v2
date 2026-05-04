import type { StockTakeSessionDetail } from "@shop/contracts";
import PDFDocument from "pdfkit";
import {
  renderStockTakeBookletPdf,
  renderStockTakeVarianceReportPdf,
  writeStockTakePageNumbers,
} from "./stock-take-pdf-renderer.js";

type StockTakePdfFile = {
  body: Buffer;
  contentType: "application/pdf";
  filename: string;
};

export async function toStockTakeBookletPdfFile(
  session: StockTakeSessionDetail,
): Promise<StockTakePdfFile> {
  return renderStockTakePdf({
    filename: `${safeFilename(session.stockTakeReference)}-booklet.pdf`,
    render: (doc) => renderStockTakeBookletPdf(doc, session),
    session,
    subject: "Physical stock-take booklet",
    title: `Stock-take booklet ${session.stockTakeReference}`,
  });
}

export async function toStockTakeVarianceReportPdfFile(
  session: StockTakeSessionDetail,
): Promise<StockTakePdfFile> {
  return renderStockTakePdf({
    filename: `${safeFilename(session.stockTakeReference)}-variance-report.pdf`,
    render: (doc) => renderStockTakeVarianceReportPdf(doc, session),
    session,
    subject: "Applied stock-take variance report",
    title: `Variance report ${session.stockTakeReference}`,
  });
}

async function renderStockTakePdf(input: {
  filename: string;
  render: (doc: PDFKit.PDFDocument) => void;
  session: StockTakeSessionDetail;
  subject: string;
  title: string;
}): Promise<StockTakePdfFile> {
  const doc = new PDFDocument({
    bufferPages: true,
    info: {
      Author: input.session.generatedByUserSlug ?? "Shop App",
      Subject: input.subject,
      Title: input.title,
    },
    margin: 42,
    size: "A4",
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  input.render(doc);
  writeStockTakePageNumbers(doc, input.session.stockTakeReference);
  doc.end();

  return {
    body: await finished,
    contentType: "application/pdf",
    filename: input.filename,
  };
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-") || "stock-take";
}
