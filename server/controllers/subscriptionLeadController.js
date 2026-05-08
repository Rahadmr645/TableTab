import SubscriptionPaymentLead from "../models/SubscriptionPaymentLead.js";
import { getGmailFieldError } from "../utils/gmailValidation.js";

export const submitSubscriptionPaymentLead = async (req, res) => {
  try {
    const { planKey, planName, paymentGmail, paymentNote } = req.body || {};

    if (!planKey || !planName || !paymentGmail) {
      return res.status(400).json({
        message: "planKey, planName, and paymentGmail are required",
      });
    }

    const gmailErr = getGmailFieldError(paymentGmail);
    if (gmailErr) {
      return res.status(400).json({
        message: gmailErr,
      });
    }

    await SubscriptionPaymentLead.create({
      planKey: String(planKey).trim(),
      planName: String(planName).trim(),
      paymentGmail: String(paymentGmail).toLowerCase().trim(),
      paymentNote: paymentNote != null ? String(paymentNote).trim() : "",
    });

    res.status(201).json({ message: "Submission received" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save submission",
      error: error.message,
    });
  }
};
