import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: "TableTab",
    to,
    subject,
    text,
  });
};

export async function sendEmailWithPdfAttachment(
  to,
  subject,
  textBody,
  pdfBuffer,
  pdfFilename = "tabletab-trial-slip.pdf",
) {
  await transporter.sendMail({
    from: "TableTab",
    to,
    subject,
    text: textBody,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export default sendEmail;
