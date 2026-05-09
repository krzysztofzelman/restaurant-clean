import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/api';
import StripePayment from '../components/StripePayment';
import type { Order } from '../lib/database.types';

const SESSION_KEY = 'pendingOrderId';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalAmount } =
    useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [placedOrder, setPlacedOrder] = useState<{ id: string } | null>(
    () => {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? { id: saved } : null;
    },
  );

  // Clear sessionStorage when payment succeeds or order is cancelled
  useEffect(() => {
    if (!placedOrder) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [placedOrder]);

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    if (cart.length === 0) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const order: Order = await createOrder({
        userId: user.id,
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        deliveryAddress,
        notes,
      });
      sessionStorage.setItem(SESSION_KEY, order.id);
      setPlacedOrder(order);
    } catch (err: unknown) {
      setError(
        'Błąd składania zamówienia: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    sessionStorage.removeItem(SESSION_KEY);
    setSuccess('Płatność udana, przekierowanie...');
    setTimeout(() => navigate('/orders'), 2000);
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCancelOrder = async () => {
    try {
      const { updateOrderStatus } = await import('../services/api');
      await updateOrderStatus(placedOrder!.id, 'cancelled');
    } catch {
      // ignore error on cancel
    }
    sessionStorage.removeItem(SESSION_KEY);
    setPlacedOrder(null);
  };

  if (cart.length === 0 && !placedOrder) {
    return (
      <div className="container py-5 text-center">
        {success ? (
          <>
            <div className="text-success mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
              </svg>
            </div>
            <h2>Płatność udana, przekierowanie...</h2>
            <p className="text-muted">Zamówienie jest realizowane.</p>
          </>
        ) : (
          <>
            <h2>Koszyk jest pusty</h2>
            <p className="text-muted">
              Dodaj dania z menu, aby złożyć zamówienie.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/menu')}
            >
              Przeglądaj menu
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Twój koszyk</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row">
        <div className="col-lg-8">
          <div className="list-group mb-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div className="flex-grow-1">
                  <h6 className="mb-0">{item.name}</h6>
                  <small className="text-muted">
                    {(item.price * item.quantity).toFixed(2)} zł
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span className="fw-bold mx-1">{item.quantity}</span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm ms-2"
                    onClick={() => removeFromCart(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Podsumowanie</h5>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span>Suma:</span>
                <span className="fw-bold fs-5">
                  {totalAmount.toFixed(2)} zł
                </span>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Adres dostawy (opcjonalnie)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Uwagi (opcjonalnie)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Np. brak orzechów, extra sos..."
                />
              </div>

              {placedOrder ? (
                <>
                  <StripePayment
                    orderId={placedOrder.id}
                    amount={totalAmount}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                  <button
                    className="btn btn-outline-danger w-100 mt-2"
                    onClick={handleCancelOrder}
                  >
                    Anuluj zamówienie
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-success w-100"
                  onClick={handlePlaceOrder}
                  disabled={submitting || placedOrder !== null}
                >
                  {submitting ? 'Składanie...' : 'Złóż zamówienie'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
