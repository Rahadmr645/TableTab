import React, { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
import { API_BASE_URL } from "../../utils/apiBaseUrl.js";

const cardStyle = {
  base: {
    fontSize: "16px",
    color: "#eef2f8",
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    "::placeholder": { color: "#5c6a7e" },
  },
  invalid: { color: "#fecaca" },
};

function apiBase() {
  if (API_BASE_URL === null) return null;
  return API_BASE_URL || "";
}

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function SubscriptionPaidCardStep({
  clientSecret,
  amountCents,
  onSuccess,
  onBack,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handlePay = async (e) => {
    e.preventDefault();
    setErr("");
    if (!stripe || !elements || !clientSecret) return;

    const card = elements.getElement(CardNumberElement);
    if (!card) return;

    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card } },
      );
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      if (paymentIntent?.status !== "succeeded" || !paymentIntent?.id) {
        setErr("Payment did not complete.");
        setLoading(false);
        return;
      }
      const base = apiBase();
      if (base === null) {
        setErr("API not configured.");
        setLoading(false);
        return;
      }
      await axios.post(
        `${base}/api/public/subscription-pay/finalize`,
        { paymentIntentId: paymentIntent.id },
        { headers: { "Content-Type": "application/json" } },
      );
      onSuccess();
    } catch (ex) {
      const msg =
        ex.response?.data?.message || ex.message || "Payment failed.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const amt = (amountCents / 100).toFixed(2);

  return (
    <form className="sub-plans-modal-form" onSubmit={handlePay}>
      <p className="sub-plans-modal-pay-amount">
        Amount due: <strong>${amt}</strong> USD
      </p>
      <label className="sub-plans-modal-label">Card number</label>
      <div className="sub-plans-stripe-wrap">
        <CardNumberElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">Expiry</label>
      <div className="sub-plans-stripe-wrap">
        <CardExpiryElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">CVC</label>
      <div className="sub-plans-stripe-wrap">
        <CardCvcElement options={{ style: cardStyle }} />
      </div>
      {err ? (
        <p className="sub-plans-field-error" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        className="sub-plans-modal-submit"
        disabled={!stripe || loading}
        aria-busy={loading}
      >
        {loading ? "Processing…" : `Pay $${amt}`}
      </button>
      <button
        type="button"
        className="sub-plans-modal-secondary"
        onClick={onBack}
        disabled={loading}
      >
        Back
      </button>
    </form>
  );
}

export function SubscriptionTrialCardStep({
  clientSecret,
  onSuccess,
  onBack,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setErr("");
    if (!stripe || !elements || !clientSecret) return;
    const card = elements.getElement(CardNumberElement);
    if (!card) return;

    setLoading(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: { card } },
      );
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      if (setupIntent?.status !== "succeeded" || !setupIntent?.id) {
        setErr("Card setup did not complete.");
        setLoading(false);
        return;
      }
      const base = apiBase();
      if (base === null) {
        setErr("API not configured.");
        setLoading(false);
        return;
      }
      await axios.post(
        `${base}/api/subscription/trial-setup/finalize`,
        { setupIntentId: setupIntent.id },
        {
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
        },
      );
      onSuccess();
    } catch (ex) {
      const msg =
        ex.response?.data?.message || ex.message || "Could not save card.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="sub-plans-modal-form" onSubmit={handleSave}>
      <p className="sub-plans-modal-intro">
        No charge during your trial — this secures your payment method for when
        you upgrade after the 1-month trial.
      </p>
      <label className="sub-plans-modal-label">Card number</label>
      <div className="sub-plans-stripe-wrap">
        <CardNumberElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">Expiry</label>
      <div className="sub-plans-stripe-wrap">
        <CardExpiryElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">CVC</label>
      <div className="sub-plans-stripe-wrap">
        <CardCvcElement options={{ style: cardStyle }} />
      </div>
      {err ? (
        <p className="sub-plans-field-error" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        className="sub-plans-modal-submit"
        disabled={!stripe || loading}
        aria-busy={loading}
      >
        {loading ? "Saving…" : "Save card"}
      </button>
      <button
        type="button"
        className="sub-plans-modal-secondary"
        onClick={onBack}
        disabled={loading}
      >
        Back
      </button>
    </form>
  );
}

/** Trial request without login: finalize creates SubscriptionPaymentLead + email. */
export function SubscriptionPublicTrialCardStep({
  clientSecret,
  paymentNote,
  onSuccess,
  onBack,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setErr("");
    if (!stripe || !elements || !clientSecret) return;
    const card = elements.getElement(CardNumberElement);
    if (!card) return;

    setLoading(true);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: { card } },
      );
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      if (setupIntent?.status !== "succeeded" || !setupIntent?.id) {
        setErr("Card setup did not complete.");
        setLoading(false);
        return;
      }
      const base = apiBase();
      if (base === null) {
        setErr("API not configured.");
        setLoading(false);
        return;
      }
      const { data: finData } = await axios.post(
        `${base}/api/public/trial-request/setup/finalize`,
        {
          setupIntentId: setupIntent.id,
          paymentNote: paymentNote ?? "",
        },
        { headers: { "Content-Type": "application/json" } },
      );
      onSuccess(finData);
    } catch (ex) {
      const msg =
        ex.response?.data?.message || ex.message || "Could not save card.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="sub-plans-modal-form" onSubmit={handleSave}>
      <p className="sub-plans-modal-intro">
        No charge for the trial month — your card is saved securely with Stripe
        for when you continue after the trial.
      </p>
      <label className="sub-plans-modal-label">Card number</label>
      <div className="sub-plans-stripe-wrap">
        <CardNumberElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">Expiry</label>
      <div className="sub-plans-stripe-wrap">
        <CardExpiryElement options={{ style: cardStyle }} />
      </div>
      <label className="sub-plans-modal-label">CVC</label>
      <div className="sub-plans-stripe-wrap">
        <CardCvcElement options={{ style: cardStyle }} />
      </div>
      {err ? (
        <p className="sub-plans-field-error" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        className="sub-plans-modal-submit"
        disabled={!stripe || loading}
        aria-busy={loading}
      >
        {loading ? "Saving…" : "Save card & submit trial request"}
      </button>
      <button
        type="button"
        className="sub-plans-modal-secondary"
        onClick={onBack}
        disabled={loading}
      >
        Back
      </button>
    </form>
  );
}
