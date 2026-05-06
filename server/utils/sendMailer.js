import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    "[sendMailer] EMAIL_USER or EMAIL_PASS is missing. OTP emails will fail.",
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const sendEmail = async (to, subject, text) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      "Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.",
    );
  }

  await transporter.sendMail({
    from: `TableTab <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

export default sendEmail;
