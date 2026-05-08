import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import "./SubscriptionPlans.css";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";
import {
  SubscriptionPaidCardStep,
  SubscriptionTrialCardStep,
  SubscriptionPublicTrialCardStep,
} from "./SubscriptionStripeSteps.jsx";

const PLANS = [
  {
    key: "trial",
    name: "Trial",
    badge: "Start here",
    priceLine: "1 month free for new restaurants",
    description:
      "Explore TableTab with your team for one full month before you commit. Use that time to set up menus, outlets, and staff.",
    features: [
      "1 month trial — full product access while you onboard",
      "Owner account and staff roles (manager, chef, cashier)",
      "Menu, categories, and table QR flows",
      "Orders and kitchen / cashier dashboards",
    ],
    footnote:
      "When your 1-month trial ends, choose a paid plan to keep serving customers without interruption.",
    selectCta: "Choose Trial",
    payingIntro:
      "Your trial runs for 1 month at no charge. We still need a Gmail address on file so our team can match this request to your restaurant.",
    payingHint:
      "Use @gmail.com, add an optional note, then continue to enter your card (no charge during the trial month).",
  },
  {
    key: "standard",
    name: "Standard",
    badge: "Growing teams",
    priceLine: "Contact us for current pricing",
    description:
      "Reliable operations for one busy location: digital menu, orders, and staff tools with email-based security for your team.",
    features: [
      "Everything in Trial, on an active subscription",
      "Priority email support during business hours",
      "Usage aligned with your restaurant slug and tenant",
      "Subscription period tracking in your owner dashboard",
    ],
    footnote:
      'Billing and plan keys are stored with your tenant (for example "standard" or "pro" depending on your agreement).',
    selectCta: "Choose Standard",
    payingIntro:
      "Pay securely with your card. Use a Gmail address for the receipt — you must complete payment on this screen.",
    payingHint:
      "Enter a @gmail.com address for receipts and verification. Then add your card and pay.",
  },
  {
    key: "pro",
    name: "Pro",
    badge: "Multi-outlet",
    priceLine: "Contact us for enterprise pricing",
    description:
      "For restaurant groups and brands that need more outlets, higher volume, and a closer partnership with our team.",
    features: [
      "Multiple branches under one platform account",
      "Higher limits and optional custom integrations (by agreement)",
      "Dedicated onboarding and account review",
      "Flexible contract terms for franchises and groups",
    ],
    footnote:
      "Tell us how many locations you run and we'll match you to the right plan and rollout.",
    selectCta: "Choose Pro",
    payingIntro:
      "Pay securely with your card. Use a Gmail address for the receipt — you must complete payment on this screen.",
    payingHint:
      "Enter a @gmail.com address for receipts. Then add your card and pay.",
  },
];

function getGmailFieldError(raw) {
  const s = String(raw ?? "").trim();
  if (!s) {
    return "Enter your Gmail address.";
  }
  if (/\s/.test(s)) {
    return "Remove spaces from the email.";
  }
  const lower = s.toLowerCase();
  const parts = lower.split("@");
  if (parts.length !== 2) {
    return "Use exactly one @ (example: you@gmail.com).";
  }
  const [local, domain] = parts;
  if (!local || !domain) {
    return "Enter both the name and @gmail.com.";
  }
  if (domain !== "gmail.com" && domain !== "googlemail.com") {
    return "Only @gmail.com or @googlemail.com is allowed.";
  }
  if (local.length > 64) {
    return "That address is too long before the @.";
  }
  const localOk =
    /^[a-z0-9]$/.test(local) ||
    /^[a-z0-9][a-z0-9._+-]*[a-z0-9]$/.test(local);
  if (!localOk) {
    return "Use letters, numbers, and . _ + only before @ (for example you@gmail.com).";
  }
  return "";
}

function apiBase() {
  if (API_BASE_URL === null) return null;
  return API_BASE_URL || "";
}

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const stripePublishableKey = useMemo(
    () =>
      String(
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
          import.meta.env.VITE_API_PUBLISH_KEY ||
          "",
      ).trim(),
    [],
  );

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null;
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  const [billingContext, setBillingContext] = useState(null);
  const [activeTrialCardFlow, setActiveTrialCardFlow] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payStep, setPayStep] = useState("details");
  const [paymentGmail, setPaymentGmail] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [amountCents, setAmountCents] = useState(null);
  const [setupClientSecret, setSetupClientSecret] = useState("");
  const [trialLoadError, setTrialLoadError] = useState("");
  const [trialLoading, setTrialLoading] = useState(false);
  const [publicTrialSetupSecret, setPublicTrialSetupSecret] = useState("");

  useEffect(() => {
    document.body.style.overflow = "";
    return undefined;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (API_BASE_URL === null) {
      setBillingContext({ loggedIn: false });
      return undefined;
    }
    const base = API_BASE_URL || "";
    (async () => {
      try {
        const { data } = await axios.get(`${base}/api/subscription/billing-context`, {
          headers: { ...authHeader() },
        });
        if (!cancelled) setBillingContext(data);
      } catch {
        if (!cancelled) setBillingContext({ loggedIn: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const closeModal = () => {
    setSelected(null);
    setPayStep("details");
    setPaymentGmail("");
    setPaymentNote("");
    setGmailError("");
    setDoneMessage("");
    setSubmitting(false);
    setClientSecret("");
    setAmountCents(null);
    setSetupClientSecret("");
    setTrialLoadError("");
    setTrialLoading(false);
    setActiveTrialCardFlow(false);
    setPublicTrialSetupSecret("");
  };

  const openPlan = async (plan) => {
    setSelected(plan);
    setActiveTrialCardFlow(false);
    setPaymentGmail("");
    setPaymentNote("");
    setGmailError("");
    setDoneMessage("");
    setClientSecret("");
    setAmountCents(null);
    setSetupClientSecret("");
    setTrialLoadError("");
    setPublicTrialSetupSecret("");
    setPayStep("details");

    let ctx = billingContext;
    if (ctx === null && API_BASE_URL !== null) {
      try {
        const base = apiBase();
        const { data } = await axios.get(`${base}/api/subscription/billing-context`, {
          headers: { ...authHeader() },
        });
        ctx = data;
        setBillingContext(data);
      } catch {
        ctx = { loggedIn: false };
        setBillingContext(ctx);
      }
    }

    const isTrial =
      ctx?.loggedIn && ctx?.subscriptionStatus === "trial";

    if (plan.key === "trial" && isTrial) {
      setActiveTrialCardFlow(true);
      setPayStep("trialCard");
      const base = apiBase();
      if (base === null) {
        setTrialLoadError("API is not configured.");
        return;
      }
      setTrialLoading(true);
      try {
        const { data } = await axios.post(
          `${base}/api/subscription/trial-setup/start`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              ...authHeader(),
            },
          },
        );
        setSetupClientSecret(data.clientSecret || "");
        if (!data.clientSecret) {
          setTrialLoadError("Could not start card setup.");
        }
      } catch (e) {
        setTrialLoadError(
          e.response?.data?.message ||
            e.message ||
            "Could not start card setup.",
        );
      } finally {
        setTrialLoading(false);
      }
    }
  };

  const submitLead = async () => {
    if (!selected) return;
    const errMsg = getGmailFieldError(paymentGmail);
    if (errMsg) {
      setGmailError(errMsg);
      return;
    }
    setGmailError("");
    if (API_BASE_URL === null) {
      alert(
        "API URL is not configured. Set VITE_API_URL in admin/.env, or send your plan choice and Gmail to your TableTab contact manually.",
      );
      return;
    }

    const base = apiBase();
    const url = `${base}/api/public/subscription-payment-lead`;

    setSubmitting(true);
    setDoneMessage("");
    try {
      await axios.post(
        url,
        {
          planKey: selected.key,
          planName: selected.name,
          paymentGmail: paymentGmail.trim(),
          paymentNote: paymentNote.trim(),
        },
        { headers: { "Content-Type": "application/json" } },
      );
      const isTrial = selected.key === "trial";
      setDoneMessage(
        isTrial
          ? "Thanks — we received your trial request and Gmail. Our team will follow up so you can start your 1-month trial."
          : "Thanks — we received your Gmail and plan choice. Our team will verify your payment and update your subscription.",
      );
    } catch (e) {
      const dataMsg = e.response?.data?.message;
      const errDetail = e.response?.data?.error;
      const msg =
        [dataMsg, errDetail].filter(Boolean).join(" — ") ||
        e.message ||
        "Could not send. Check that the server is running and try again.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const continueToPaidCard = async () => {
    if (!selected || (selected.key !== "standard" && selected.key !== "pro"))
      return;
    const errMsg = getGmailFieldError(paymentGmail);
    if (errMsg) {
      setGmailError(errMsg);
      return;
    }
    setGmailError("");
    const base = apiBase();
    if (base === null) {
      alert("API is not configured.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${base}/api/public/subscription-pay/start`,
        {
          planKey: selected.key,
          receiptEmail: paymentGmail.trim(),
        },
        { headers: { "Content-Type": "application/json" } },
      );
      setClientSecret(data.clientSecret || "");
      setAmountCents(Number(data.amountCents) || 0);
      setPayStep("paidCard");
    } catch (e) {
      if (e.response?.status === 503) {
        alert(
          e.response?.data?.message ||
            "Card payment is not available on the server. You can submit payment proof manually below.",
        );
        setPayStep("details");
      } else {
        alert(
          e.response?.data?.message ||
            e.message ||
            "Could not start payment.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const continueToPublicTrialCard = async () => {
    if (!selected || selected.key !== "trial") return;
    const errMsg = getGmailFieldError(paymentGmail);
    if (errMsg) {
      setGmailError(errMsg);
      return;
    }
    setGmailError("");
    if (!stripePublishableKey) {
      submitLead();
      return;
    }
    const base = apiBase();
    if (base === null) {
      alert("API is not configured.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${base}/api/public/trial-request/setup/start`,
        { receiptEmail: paymentGmail.trim() },
        { headers: { "Content-Type": "application/json" } },
      );
      const secret = data.clientSecret || "";
      if (!secret) {
        alert("Could not start card setup.");
        return;
      }
      setPublicTrialSetupSecret(secret);
    } catch (e) {
      if (e.response?.status === 503) {
        alert(
          e.response?.data?.message ||
            "Card setup is not available. Submit with Gmail only, or try again later.",
        );
      } else {
        alert(
          e.response?.data?.message ||
            e.message ||
            "Could not start card setup.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modalIntro =
    selected?.key === "trial" && activeTrialCardFlow
      ? "You're on a 1-month trial. Add your card — you won't be charged during the trial; we use it when you move to a paid plan."
      : selected?.payingIntro;

  const modalHint =
    selected?.key === "trial" && activeTrialCardFlow
      ? "Secured by Stripe. After you save your card, we email your TableTab account address to confirm."
      : selected?.payingHint;

  const showPaidStripe =
    selected &&
    (selected.key === "standard" || selected.key === "pro") &&
    payStep === "paidCard" &&
    clientSecret &&
    stripePromise;

  const showTrialStripe =
    selected &&
    selected.key === "trial" &&
    activeTrialCardFlow &&
    payStep === "trialCard" &&
    setupClientSecret &&
    stripePromise;

  const showPublicTrialStripe =
    selected &&
    selected.key === "trial" &&
    !activeTrialCardFlow &&
    publicTrialSetupSecret &&
    stripePromise;

  return (
    <div className="sub-plans-page">
      <header className="sub-plans-header">
        <button
          type="button"
          className="sub-plans-back"
          onClick={() => navigate("/login", { replace: false })}
        >
          ← Back to sign in
        </button>
        <h1 className="sub-plans-title">Subscription plans</h1>
        <p className="sub-plans-lead">
          New to TableTab or need to move off trial? Compare plans below. Trial
          sign-up uses your Gmail, then a secure card step (no trial charge).
          Paid plans bill by card after you confirm.
        </p>
      </header>

      <div className="sub-plans-grid">
        {PLANS.map((plan) => (
          <article
            key={plan.key}
            className={`admin-surface sub-plans-card sub-plans-card--${plan.key}`}
          >
            <p className="sub-plans-badge">{plan.badge}</p>
            <h2 className="sub-plans-card-title">{plan.name}</h2>
            <p className="sub-plans-price">{plan.priceLine}</p>
            <p className="sub-plans-desc">{plan.description}</p>
            <ul className="sub-plans-features">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="sub-plans-footnote">{plan.footnote}</p>
            <button
              type="button"
              className="sub-plans-select-btn"
              onClick={() => openPlan(plan)}
            >
              {plan.selectCta}
            </button>
          </article>
        ))}
      </div>

      <footer className="sub-plans-footer">
        <p className="sub-plans-footer-note">
          Already have an account?{" "}
          <button
            type="button"
            className="sub-plans-footer-link"
            onClick={() => navigate("/login")}
          >
            Sign in as owner or staff
          </button>
        </p>
      </footer>

      {selected ? (
        <div
          className="sub-plans-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="admin-surface sub-plans-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-plans-modal-title"
          >
            <div className="sub-plans-modal-head">
              <h2 id="sub-plans-modal-title" className="sub-plans-modal-title">
                {selected.name} plan
              </h2>
              <button
                type="button"
                className="sub-plans-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {doneMessage ? (
              <>
                <p className="sub-plans-modal-success">{doneMessage}</p>
                <button
                  type="button"
                  className="sub-plans-modal-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
              </>
            ) : selected.key === "trial" && activeTrialCardFlow ? (
              <>
                <p className="sub-plans-modal-intro">{modalIntro}</p>
                <p className="sub-plans-modal-hint">{modalHint}</p>
                {!stripePublishableKey ? (
                  <p className="sub-plans-field-error" role="alert">
                    Card setup needs{" "}
                    <code className="sub-plans-code">VITE_STRIPE_PUBLISHABLE_KEY</code>{" "}
                    (or <code className="sub-plans-code">VITE_API_PUBLISH_KEY</code>)
                    in admin.env.
                  </p>
                ) : trialLoading ? (
                  <p className="sub-plans-modal-intro">Loading card form…</p>
                ) : trialLoadError ? (
                  <>
                    <p className="sub-plans-field-error" role="alert">
                      {trialLoadError}
                    </p>
                    <button
                      type="button"
                      className="sub-plans-modal-secondary"
                      onClick={closeModal}
                    >
                      Close
                    </button>
                  </>
                ) : showTrialStripe ? (
                  <Elements stripe={stripePromise} key={setupClientSecret}>
                    <SubscriptionTrialCardStep
                      clientSecret={setupClientSecret}
                      onSuccess={() => {
                        setDoneMessage(
                          "Your card is saved. Check your inbox — we sent a confirmation email to your TableTab account email.",
                        );
                      }}
                      onBack={closeModal}
                    />
                  </Elements>
                ) : null}
              </>
            ) : showPublicTrialStripe ? (
              <>
                <p className="sub-plans-modal-intro">
                  Enter your card below. We use Stripe — no charge during your
                  1-month trial. Confirmation goes to{" "}
                  <strong>{paymentGmail.trim()}</strong>.
                </p>
                <p className="sub-plans-modal-hint">
                  You can go back to edit your Gmail or note if needed.
                </p>
                <Elements
                  stripe={stripePromise}
                  key={publicTrialSetupSecret}
                >
                  <SubscriptionPublicTrialCardStep
                    clientSecret={publicTrialSetupSecret}
                    paymentNote={paymentNote}
                    onSuccess={(fin) => {
                      const em = paymentGmail.trim();
                      setPublicTrialSetupSecret("");
                      closeModal();
                      if (fin?.enrollmentToken) {
                        navigate("/trial-create-account", {
                          state: {
                            enrollmentToken: fin.enrollmentToken,
                            email: em,
                          },
                        });
                      } else {
                        alert(
                          "Card saved and email sent. Could not create signup link — ensure SECTRATE_KEY is set on the server.",
                        );
                      }
                    }}
                    onBack={() => setPublicTrialSetupSecret("")}
                  />
                </Elements>
              </>
            ) : showPaidStripe ? (
              <>
                <p className="sub-plans-modal-intro">{modalIntro}</p>
                <p className="sub-plans-modal-hint">{modalHint}</p>
                <Elements stripe={stripePromise} key={clientSecret}>
                  <SubscriptionPaidCardStep
                    clientSecret={clientSecret}
                    amountCents={amountCents}
                    onSuccess={() => {
                      setDoneMessage(
                        "Payment successful. Check your Gmail — we sent a confirmation message to the address you used for the receipt.",
                      );
                    }}
                    onBack={() => {
                      setPayStep("details");
                      setClientSecret("");
                      setAmountCents(null);
                    }}
                  />
                </Elements>
              </>
            ) : (
              <>
                <p className="sub-plans-modal-intro">{modalIntro}</p>
                <p className="sub-plans-modal-hint">{modalHint}</p>

                {(selected.key === "standard" || selected.key === "pro") &&
                !stripePublishableKey ? (
                  <p className="sub-plans-modal-hint sub-plans-modal-hint--warn">
                    Card payment needs a Stripe publishable key in admin.env.
                    You can still submit details manually below.
                  </p>
                ) : null}

                <form
                  className="sub-plans-modal-form"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      selected.key === "trial" &&
                      !activeTrialCardFlow &&
                      stripePublishableKey
                    ) {
                      continueToPublicTrialCard();
                    } else if (
                      (selected.key === "standard" ||
                        selected.key === "pro") &&
                      stripePublishableKey
                    ) {
                      continueToPaidCard();
                    } else {
                      submitLead();
                    }
                  }}
                >
                  <label
                    className="sub-plans-modal-label"
                    htmlFor="payment-gmail"
                  >
                    {selected.key === "trial" ? (
                      <>
                        Your Gmail <span className="sub-plans-req">*</span>
                      </>
                    ) : (
                      <>
                        Gmail for receipt / proof{" "}
                        <span className="sub-plans-req">*</span>
                      </>
                    )}
                  </label>
                  <input
                    id="payment-gmail"
                    className={
                      gmailError
                        ? "sub-plans-modal-input sub-plans-modal-input--invalid"
                        : "sub-plans-modal-input"
                    }
                    type="text"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@gmail.com"
                    value={paymentGmail}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPaymentGmail(v);
                      if (gmailError) {
                        setGmailError(getGmailFieldError(v));
                      }
                    }}
                    onBlur={() => {
                      if (!paymentGmail.trim()) {
                        setGmailError("");
                        return;
                      }
                      setGmailError(getGmailFieldError(paymentGmail));
                    }}
                    aria-invalid={gmailError ? "true" : "false"}
                    aria-describedby={
                      gmailError ? "payment-gmail-error" : undefined
                    }
                  />
                  {gmailError ? (
                    <p
                      id="payment-gmail-error"
                      className="sub-plans-field-error"
                      role="alert"
                    >
                      {gmailError}
                    </p>
                  ) : null}

                  <label
                    className="sub-plans-modal-label"
                    htmlFor="payment-note"
                  >
                    {selected.key === "trial"
                      ? "Note for our team (optional)"
                      : "Transaction note (optional)"}
                  </label>
                  <textarea
                    id="payment-note"
                    className="sub-plans-modal-textarea"
                    rows={3}
                    placeholder={
                      selected.key === "trial"
                        ? "Restaurant name, city, or how we should contact you"
                        : "Reference number, date, or other details"
                    }
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="sub-plans-modal-submit"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting
                      ? "Please wait…"
                      : selected.key === "trial" && !activeTrialCardFlow
                        ? stripePublishableKey
                          ? "Continue to add card"
                          : "Submit trial request"
                        : selected.key === "standard" ||
                            selected.key === "pro"
                          ? stripePublishableKey
                            ? "Continue to card payment"
                            : "Submit payment proof"
                          : "Submit"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SubscriptionPlans;
