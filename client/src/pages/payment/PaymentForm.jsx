import React, { useState, useContext, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";
import { AuthContext } from "../../context/CartContext";
import "./PaymentForm.css";

const stripePromise = loadStripe(import.meta.env.VITE_API_PUBLISH_KEY);

const PaymentFormInner = ({ amount, onSuccess }) => {
  const { URL } = useContext(AuthContext);
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
      const { data } = await axios.post(
        `${URL}/api/payment/create-payment-intent`,
        { amount }
      );

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
        onSuccess && onSuccess();
      }
    } catch (err) {
      console.error(err);
      setCardError("Something went wrong with payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment_container">
      <form onSubmit={handleSubmit} className="payment-forms">
        <h3>Enter Your Card Details</h3>

        <label>Card Number</label>
        <CardNumberElement
          className="StripeElement"
          options={{
            style: {
              base: { fontSize: "16px", color: "#424770" },
              invalid: { color: "#9e2146" },
            },
          }}
        />

        <label>Expiry Date</label>
        <CardExpiryElement
          className="StripeElement"
          options={{
            style: {
              base: { fontSize: "16px", color: "#424770" },
              invalid: { color: "#9e2146" },
            },
          }}
        />

        <label>CVC</label>
        <CardCvcElement
          className="StripeElement"
          options={{
            style: {
              base: { fontSize: "16px", color: "#424770" },
              invalid: { color: "#9e2146" },
            },
          }}
        />

        {cardError && <p className="error">{cardError}</p>}

        <button
          type="submit"
          disabled={!stripe || loading}
          className="pay-btn"
        >
          {loading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
        </button>

        <button type="button" className="btn" disabled={loading}>
          Cancel
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