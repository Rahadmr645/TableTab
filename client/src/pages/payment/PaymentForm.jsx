import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "../../utils/api.js";
import "./PaymentForm.css";

const stripePromise = loadStripe(import.meta.env.VITE_API_PUBLISH_KEY);

const PaymentFormInner = ({ amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCardError("");

    if (!stripe || !elements) return;

    if (!amount || amount <= 0) {
      setCardError("Invalid amount");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/api/payment/create-payment-intent", {
        amount,
      });

      if (!data.clientSecret) {
        setCardError("Payment could not be initiated.");
        setLoading(false);
        return;
      }

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
        },
      });

      if (result.error) {
        setCardError(result.error.message);
      } else if (result.paymentIntent?.status === "succeeded") {
        try {
          await Promise.resolve(onSuccess?.());
        } catch (finalizeErr) {
          console.error(finalizeErr);
          setCardError(
            finalizeErr?.response?.data?.message ||
              "Payment went through, but we could not finish your order. Please contact the venue.",
          );
        }
      }
    } catch (err) {
      console.error(err);
      setCardError("Something went wrong with payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`payment_container${loading ? " payment_container--busy" : ""}`}
    >
      {loading ? (
        <div
          className="payment-loading-shade"
          role="presentation"
          aria-hidden
        />
      ) : null}
      <form onSubmit={handleSubmit} className="payment-forms">
        <h3>Card details</h3>

        <label>Card number</label>
        <CardNumberElement
          className="StripeElement"
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#e8ecf1",
                fontFamily: "DM Sans, system-ui, sans-serif",
                "::placeholder": { color: "#6b7280" },
              },
              invalid: { color: "#fca5a5" },
            },
          }}
        />

        <label>Expiry</label>
        <CardExpiryElement
          className="StripeElement"
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#e8ecf1",
                fontFamily: "DM Sans, system-ui, sans-serif",
              },
              invalid: { color: "#fca5a5" },
            },
          }}
        />

        <label>CVC</label>
        <CardCvcElement
          className="StripeElement"
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#e8ecf1",
                fontFamily: "DM Sans, system-ui, sans-serif",
              },
              invalid: { color: "#fca5a5" },
            },
          }}
        />

        {cardError && <p className="error">{cardError}</p>}

        <button
          type="submit"
          disabled={!stripe || loading}
          className="pay-btn"
        >
          {loading ? "Processing…" : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

const StripePayment = ({ amount, onSuccess }) => (
  <Elements stripe={stripePromise}>
    <PaymentFormInner amount={amount} onSuccess={onSuccess} />
  </Elements>
);

export default StripePayment;