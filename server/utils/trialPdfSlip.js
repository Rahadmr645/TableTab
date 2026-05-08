import PDFDocument from "pdfkit";

/**
 * @param {{ email: string, setupIntentId: string, issuedAt?: Date }} opts
 * @returns {Promise<Buffer>}
 */
export function buildTrialSlipPdfBuffer({
  email,
  setupIntentId,
  issuedAt = new Date(),
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const dateStr = issuedAt.toISOString();

    doc.fontSize(18).text("TableTab — Trial confirmation slip", { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Issued: ${dateStr}`);
    doc.text(`Gmail on file: ${email}`);
    doc.text(`Stripe reference: ${setupIntentId}`);
    doc.moveDown();
    doc.fontSize(12).text("Amount charged: USD 0.00", { continued: false });
    doc.fontSize(10).text(
      "(Trial period — payment method secured for use after your 1-month trial if you continue.)",
    );
    doc.moveDown();
    doc.fontSize(10).text(
      "This document confirms TableTab received your trial signup and saved your card securely with Stripe. " +
        "Keep this slip for your records.",
      { align: "left" },
    );
    doc.end();
  });
}
