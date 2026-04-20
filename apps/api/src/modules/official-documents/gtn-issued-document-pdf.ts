import {
  gtnResponseSchema,
  type IssuedDocumentSnapshotResponse,
} from "@shop/contracts";
import PDFDocument from "pdfkit";
import { renderGtnIssuedDocumentPdf } from "./gtn-issued-document-pdf-renderer.js";
import { safeFilename } from "./sales-issued-document-pdf.support.js";

export type IssuedGtnDocumentFile = {
  body: Buffer;
  contentType: "application/pdf";
  filename: string;
};

export async function toGtnIssuedDocumentPdfFile(
  snapshot: IssuedDocumentSnapshotResponse,
): Promise<IssuedGtnDocumentFile> {
  const gtn = gtnResponseSchema.parse(snapshot.payloadSnapshot);
  const doc = new PDFDocument({
    bufferPages: true,
    info: {
      Author: snapshot.profileSnapshot.legalName,
      Subject: `Goods Transfer Note ${gtn.reference}`,
      Title: `Goods Transfer Note ${gtn.reference}`,
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

  renderGtnIssuedDocumentPdf(doc, {
    gtn,
    profile: snapshot.profileSnapshot,
    snapshot,
  });
  doc.end();

  return {
    body: await finished,
    contentType: "application/pdf",
    filename: `${safeFilename(snapshot.documentReference)}.pdf`,
  };
}
