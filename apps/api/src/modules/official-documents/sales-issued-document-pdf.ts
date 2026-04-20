import {
  type IssuedDocumentSnapshotResponse,
  invoiceResponseSchema,
} from "@shop/contracts";
import PDFDocument from "pdfkit";
import {
  getDocumentTitle,
  safeFilename,
} from "./sales-issued-document-pdf.support.js";
import { renderSalesIssuedDocumentPdf } from "./sales-issued-document-pdf-renderer.js";

export type IssuedSalesDocumentFile = {
  body: Buffer;
  contentType: "application/pdf";
  filename: string;
};

export async function toSalesIssuedDocumentPdfFile(
  snapshot: IssuedDocumentSnapshotResponse,
): Promise<IssuedSalesDocumentFile> {
  const invoice = invoiceResponseSchema.parse(snapshot.payloadSnapshot);
  const profile = snapshot.profileSnapshot;
  const doc = new PDFDocument({
    bufferPages: true,
    info: {
      Author: profile.legalName,
      Subject: `${getDocumentTitle(invoice)} ${invoice.reference}`,
      Title: `${getDocumentTitle(invoice)} ${invoice.reference}`,
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

  renderSalesIssuedDocumentPdf(doc, {
    invoice,
    profile,
    snapshot,
    title: getDocumentTitle(invoice),
  });
  doc.end();

  return {
    body: await finished,
    contentType: "application/pdf",
    filename: `${safeFilename(snapshot.documentReference)}.pdf`,
  };
}
