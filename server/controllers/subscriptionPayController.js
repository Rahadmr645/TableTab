import Tenant from "../models/Tenant.js";
import User from "../models/UserModel.js";
import SubscriptionPaymentLead from "../models/SubscriptionPaymentLead.js";
import { getStripe } from "../utils/stripeClient.js";
import { getGmailFieldError } from "../utils/gmailValidation.js";
import sendEmail, { sendEmailWithPdfAttachment } from "../utils/sendMailer.js";
import { buildTrialSlipPdfBuffer } from "../utils/trialPdfSlip.js";
import { signTrialEnrollmentToken } from "../middlewares/authMiddleware.js";

const PLAN_AMOUNTS_USD_CENTS = {
  standard: Math.max(
    50,
    parseInt(process.env.STRIPE_PRICE_STANDARD_CENTS || "2999", 10),
  ),
  pro: Math.max(50, parseInt(process.env.STRIPE_PRICE_PRO_CENTS || "9999", 10)),
};

function planDisplayName(key) {
  if (key === "standard") return "Standard";
  if (key === "pro") return "Pro";
  return key;
}

export async function getBillingContext(req, res) {
  try {
    if (!req.user) {
      return res.json({ loggedIn: false });
    }
    const t = await Tenant.findById(req.user.tenantId)
      .select("subscriptionStatus plan businessName")
      .lean();
    if (!t) {
      return res.json({ loggedIn: true, subscriptionStatus: null, plan: null });
    }
    return res.json({
      loggedIn: true,
      subscriptionStatus: t.subscriptionStatus,
      plan: t.plan,
      businessName: t.businessName,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load billing context" });
  }
}

export async function startSubscriptionPayment(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Card payment is not configured." });
    }

    const { planKey, receiptEmail } = req.body || {};
    const key = String(planKey || "").toLowerCase().trim();
    if (key !== "standard" && key !== "pro") {
      return res.status(400).json({ message: "planKey must be standard or pro" });
    }

    const gmailErr = getGmailFieldError(receiptEmail);
    if (gmailErr) {
      return res.status(400).json({ message: gmailErr });
    }

    const amount = PLAN_AMOUNTS_USD_CENTS[key];
    const email = String(receiptEmail).toLowerCase().trim();

    const pi = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        planKey: key,
        source: "admin_subscription_plans",
        receiptGmail: email,
      },
    });

    res.status(200).json({
      clientSecret: pi.client_secret,
      amountCents: amount,
      currency: "usd",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not start payment" });
  }
}

export async function finalizeSubscriptionPayment(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }

    const pi = await stripe.paymentIntents.retrieve(String(paymentIntentId));
    if (pi.status !== "succeeded") {
      return res
        .status(400)
        .json({ message: "Payment is not complete yet. Try again in a moment." });
    }

    const meta = pi.metadata || {};
    if (meta.source !== "admin_subscription_plans") {
      return res.status(400).json({ message: "Invalid payment intent" });
    }

    const planKey = meta.planKey || "plan";
    const to = pi.receipt_email || meta.receiptGmail;
    if (to && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendEmail(
          to,
          "TableTab — payment successful",
          `Hello,\n\nYour payment for the ${planDisplayName(planKey)} plan completed successfully. Thank you for choosing TableTab.\n\nIf you have questions, reply to this message or contact your TableTab representative.\n\n— TableTab`,
        );
      } catch (mailErr) {
        console.error("Subscription success email failed:", mailErr);
      }
    }

    res.status(200).json({ ok: true, message: "Payment recorded" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not finalize payment" });
  }
}

const TRIAL_SETUP_ROLES = new Set(["owner", "manager"]);

export async function startTrialCardSetup(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Card setup is not configured." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Sign in to add a payment method." });
    }

    if (!TRIAL_SETUP_ROLES.has(String(req.user.role))) {
      return res.status(403).json({
        message: "Only an owner or manager can add a payment method for the trial.",
      });
    }

    const tenant = await Tenant.findById(req.user.tenantId)
      .select("subscriptionStatus")
      .lean();

    if (!tenant || tenant.subscriptionStatus !== "trial") {
      return res.status(403).json({
        message: "Add a card is only available while your restaurant is on a trial.",
      });
    }

    const si = await stripe.setupIntents.create({
      payment_method_types: ["card"],
      metadata: {
        tenantId: String(req.user.tenantId),
        userId: String(req.user.userId),
        source: "admin_trial_card_setup",
      },
    });

    res.status(200).json({ clientSecret: si.client_secret });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not start card setup" });
  }
}

export async function finalizeTrialCardSetup(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Sign in required" });
    }

    const { setupIntentId } = req.body || {};
    if (!setupIntentId) {
      return res.status(400).json({ message: "setupIntentId is required" });
    }

    const si = await stripe.setupIntents.retrieve(String(setupIntentId));
    if (si.status !== "succeeded") {
      return res.status(400).json({
        message: "Card setup is not complete. Check your card details and try again.",
      });
    }

    const meta = si.metadata || {};
    if (
      meta.source !== "admin_trial_card_setup" ||
      meta.tenantId !== String(req.user.tenantId)
    ) {
      return res.status(403).json({ message: "Invalid setup intent" });
    }

    const user = await User.findById(req.user.userId).select("email").lean();
    const to = user?.email;
    if (to && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendEmail(
          to,
          "TableTab — payment method saved",
          `Hello,\n\nYour card was saved successfully for your TableTab trial account. You will not be charged during your 1-month trial; we will use this payment method when your trial ends if you continue on a paid plan.\n\n— TableTab`,
        );
      } catch (mailErr) {
        console.error("Trial setup email failed:", mailErr);
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not finish card setup" });
  }
}

/** Public trial: Gmail + SetupIntent (no login). Saved as SubscriptionPaymentLead after card succeeds. */
export async function startPublicTrialSetup(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Card setup is not configured." });
    }

    const { receiptEmail } = req.body || {};
    const gmailErr = getGmailFieldError(receiptEmail);
    if (gmailErr) {
      return res.status(400).json({ message: gmailErr });
    }

    const email = String(receiptEmail).toLowerCase().trim();

    const si = await stripe.setupIntents.create({
      payment_method_types: ["card"],
      metadata: {
        source: "admin_public_trial",
        receiptGmail: email,
      },
    });

    res.status(200).json({ clientSecret: si.client_secret });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not start card setup" });
  }
}

export async function finalizePublicTrialSetup(req, res) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    const { setupIntentId, paymentNote } = req.body || {};
    if (!setupIntentId) {
      return res.status(400).json({ message: "setupIntentId is required" });
    }

    const si = await stripe.setupIntents.retrieve(String(setupIntentId));
    if (si.status !== "succeeded") {
      return res.status(400).json({
        message: "Card setup is not complete. Check your card details and try again.",
      });
    }

    const meta = si.metadata || {};
    if (meta.source !== "admin_public_trial") {
      return res.status(400).json({ message: "Invalid setup intent" });
    }

    const paymentGmail = meta.receiptGmail;
    if (!paymentGmail || getGmailFieldError(paymentGmail)) {
      return res.status(400).json({ message: "Invalid setup data" });
    }

    await SubscriptionPaymentLead.create({
      planKey: "trial",
      planName: "Trial",
      paymentGmail: String(paymentGmail).toLowerCase().trim(),
      paymentNote:
        paymentNote != null
          ? String(paymentNote).trim()
          : "",
    });

    const to = String(paymentGmail).toLowerCase().trim();
    const sid = String(setupIntentId);

    let enrollmentToken = null;
    try {
      enrollmentToken = signTrialEnrollmentToken({
        email: to,
        setupIntentId: sid,
      });
    } catch (tokErr) {
      console.error("Enrollment token failed:", tokErr);
    }

    let pdfBuf = null;
    try {
      pdfBuf = await buildTrialSlipPdfBuffer({
        email: to,
        setupIntentId: sid,
      });
    } catch (pdfErr) {
      console.error("PDF slip failed:", pdfErr);
    }

    if (to && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const body =
          "Hello,\n\n" +
          "We received your trial request and securely saved your card with Stripe. " +
          "There is no charge during your 1-month trial. Your PDF confirmation slip is attached.\n\n" +
          "Next: on the TableTab admin site, complete “Create account” using this same Gmail address.\n\n" +
          "— TableTab";
        if (pdfBuf) {
          await sendEmailWithPdfAttachment(
            to,
            "TableTab — trial confirmation & payment slip",
            body,
            pdfBuf,
            "tabletab-trial-slip.pdf",
          );
        } else {
          await sendEmail(
            to,
            "TableTab — trial request received",
            body,
          );
        }
      } catch (mailErr) {
        console.error("Public trial email failed:", mailErr);
      }
    }

    res.status(200).json({ ok: true, enrollmentToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Could not finish trial setup" });
  }
}
