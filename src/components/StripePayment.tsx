import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { createPaymentIntent, updatePaymentStatus } from '../services/api';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
);

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      backgroundColor: '#ffffff',
      '::placeholder': { color: '#6c757d' },
    },
    invalid: { color: '#dc3545' },
  },
  hidePostalCode: true,
};

const testCardFields = [
  { label: 'Numer karty', value: '4242 4242 4242 4242' },
  { label: 'Data', value: 'dowolna przyszła' },
  { label: 'CVC', value: 'dowolne 3 cyfry' },
];

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

function PaymentForm({ orderId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCardNumber = async () => {
    try {
      await navigator.clipboard.writeText('4242424242424242');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    try {
      const { clientSecret } = await createPaymentIntent(orderId, amount);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Nie znaleziono elementu karty.');
        return;
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

      if (confirmError) {
        setError(confirmError.message ?? '');
        onError?.(confirmError.message ?? '');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await updatePaymentStatus(orderId, 'paid');
        onSuccess?.();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Wystąpił błąd płatności';
      setError(message);
      onError?.(message);
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

        <div
          className="mt-2 p-2 rounded"
          style={{ backgroundColor: '#f0f0f0', fontSize: '0.8rem' }}
        >
          <p
            className="mb-1 fw-semibold text-secondary"
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.5px',
            }}
          >
            KARTA TESTOWA
          </p>
          <table
            className="table table-sm table-borderless mb-0"
            style={{ cursor: 'pointer' }}
          >
            <thead>
              <tr>
                <th
                  className="text-secondary small fw-normal"
                  style={{ width: '40%' }}
                >
                  Pole
                </th>
                <th className="text-secondary small fw-normal">Wartość</th>
              </tr>
            </thead>
            <tbody>
              {testCardFields.map((field) => (
                <tr
                  key={field.label}
                  onClick={
                    field.label === 'Numer karty'
                      ? copyCardNumber
                      : undefined
                  }
                  className="align-middle"
                  style={
                    field.label === 'Numer karty'
                      ? { cursor: 'pointer' }
                      : undefined
                  }
                >
                  <td className="fw-medium">{field.label}</td>
                  <td className="font-monospace small text-muted">
                    {field.value}
                    {field.label === 'Numer karty' && copied && (
                      <span
                        className="text-success ms-2 fw-normal"
                        style={{ fontSize: '0.75rem' }}
                      >
                        ✓ skopiowano
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small">{error}</div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-100"
        disabled={!stripe || processing}
      >
        {processing
          ? 'Przetwarzanie...'
          : `Zapłać ${amount.toFixed(2)} zł`}
      </button>
    </form>
  );
}

interface StripePaymentProps {
  orderId: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export default function StripePayment({
  orderId,
  amount,
  onSuccess,
  onError,
}: StripePaymentProps) {
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
