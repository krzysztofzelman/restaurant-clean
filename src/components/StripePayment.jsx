import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, updatePaymentStatus } from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#212529',
      '::placeholder': { color: '#6c757d' },
    },
    invalid: { color: '#dc3545' },
  },
};

function PaymentForm({ orderId, amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    try {
      const { clientSecret } = await createPaymentIntent(orderId, amount);

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: elements.getElement(CardElement) } }
      );

      if (confirmError) {
        setError(confirmError.message);
        onError?.(confirmError.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        await updatePaymentStatus(orderId, 'paid');
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Dane karty</label>
        <div className="p-3 border rounded bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={!stripe || processing}
      >
        {processing ? 'Przetwarzanie...' : `Zapłać ${amount.toFixed(2)} zł`}
      </button>
    </form>
  );
}

export default function StripePayment({ orderId, amount, onSuccess, onError }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        orderId={orderId}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
