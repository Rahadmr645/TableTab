import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "../../utils/api.js";
import "./PaymentForm.css";
const PaymentFormInner = ({ amount, onSuccess, onLoadingChange, onlineSubMethod, isTestMode }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCardError("");

    if (!stripe || !elements) return;

    setLoading(true);
    onLoadingChange?.(true);

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/myOrders`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setCardError(result.error.message);
        setLoading(false);
        onLoadingChange?.(false);
      } else if (result.paymentIntent?.status === "succeeded") {
        try {
          await Promise.resolve(onSuccess?.(result.paymentIntent.id));
        } catch (finalizeErr) {
          console.error(finalizeErr);
          setCardError(
            finalizeErr?.response?.data?.message ||
              "Payment succeeded, but we could not complete your order. Please notify staff.",
          );
          setLoading(false);
          onLoadingChange?.(false);
        }
      } else {
        setLoading(false);
        onLoadingChange?.(false);
      }
    } catch (err) {
      console.error(err);
      setCardError("An error occurred while processing your payment.");
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className={`payment_container${loading ? " payment_container--busy" : ""}`}>
      {loading ? (
        <div
          className="payment-loading-shade"
          role="presentation"
          aria-hidden
        />
      ) : null}
      <form onSubmit={handleSubmit} className="payment-forms">
        <h3>Secure Checkout</h3>
        
        {onlineSubMethod === "apple_pay" && (
          <p className="payment-method-desc">
            🍏 Apple Pay is supported on Safari/iOS. If the Apple Pay option does not appear in the form below, you can complete payment by entering your card details.
          </p>
        )}
        {onlineSubMethod === "samsung_pay" && (
          <p className="payment-method-desc">
            📱 Samsung Pay is supported. Please enter your Samsung Pay digital card details directly in the fields below.
          </p>
        )}
        {onlineSubMethod === "google_pay" && (
          <p className="payment-method-desc">
            🤖 Google Pay is supported on Chrome/Android. If the Google Pay option does not appear in the form below, you can pay by entering your card details.
          </p>
        )}
        {onlineSubMethod === "stc_pay" && (
          <p className="payment-method-desc">
            🇸🇦 STC Pay will redirect you to secure payment verification.
          </p>
        )}
        {onlineSubMethod === "mada" && (
          <p className="payment-method-desc">
            🇸🇦 Pay securely using your local Mada debit card.
          </p>
        )}
        {onlineSubMethod === "card" && (
          <p className="payment-method-desc">
            💳 Pay securely using your Credit/Debit Card (Visa, Mastercard).
          </p>
        )}

        {isTestMode && (
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              onLoadingChange?.(true);
              try {
                const mockPiId = `pi_mock_${onlineSubMethod}_${Math.random().toString(36).substr(2, 9)}`;
                await Promise.resolve(onSuccess?.(mockPiId));
              } catch (err) {
                setCardError("Demo payment failed");
              } finally {
                setLoading(false);
                onLoadingChange?.(false);
              }
            }}
            className="payment-simulate-btn"
          >
            <span>✨</span> Simulate {onlineSubMethod.replace("_", " ").toUpperCase()} (Test Mode)
          </button>
        )}

        <PaymentElement />

        {cardError && <p className="error">{cardError}</p>}

        <button
          type="submit"
          disabled={!stripe || loading}
          className="pay-btn"
        >
          {loading ? "Processing..." : `Pay ﷼ ${(amount / 100).toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

const StripePayment = ({ amount, onSuccess, onLoadingChange, onlineSubMethod }) => {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [stripePromise, setStripePromise] = useState(null);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchIntent = async () => {
      try {
        setInitLoading(true);
        setError("");
        const { data } = await api.post("/api/payment/create-payment-intent", {
          amount,
        });
        if (active) {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
            const key = data.publishableKey || import.meta.env.VITE_API_PUBLISH_KEY;
            if (key) {
              setStripePromise(loadStripe(key));
              setIsTestMode(String(key).startsWith("pk_test"));
            } else {
              setError("Payment gateway publishable key missing.");
            }
          } else {
            setError("Could not initiate payment.");
          }
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Failed to initialize payment gateway.");
        }
      } finally {
        if (active) {
          setInitLoading(false);
        }
      }
    };
    fetchIntent();
    return () => {
      active = false;
    };
  }, [amount]);

  if (initLoading) {
    return (
      <div className="payment-init-loading">
        <div className="payment-spinner" />
        <p>Loading secure payment gateway...</p>
      </div>
    );
  }

  if (error || !stripePromise) {
    return (
      <div className="payment-init-error">
        <p className="error">{error || "Failed to load payment gateway."}</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#f0b429",
        colorBackground: "#111827",
        colorText: "#f3f4f6",
        colorDanger: "#ef4444",
        fontFamily: "Outfit, Inter, system-ui, sans-serif",
        borderRadius: "10px",
      },
    },
    paymentMethodOrder: onlineSubMethod === "stc_pay" ? ["stc_pay", "card"] : ["card", "stc_pay"]
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner
        amount={amount}
        onSuccess={onSuccess}
        onLoadingChange={onLoadingChange}
        onlineSubMethod={onlineSubMethod}
        isTestMode={isTestMode}
      />
    </Elements>
  );
};

export default StripePayment;