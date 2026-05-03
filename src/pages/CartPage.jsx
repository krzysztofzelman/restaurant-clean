import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart.jsx';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/api';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await createOrder({
        userId: user.id,
        items: cart,
        totalAmount,
        deliveryAddress,
        notes,
      });
      clearCart();
      setSuccess('Zamówienie złożone pomyślnie!');
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      setError('Błąd składania zamówienia: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h2>Koszyk jest pusty</h2>
        <p className="text-muted">Dodaj dania z menu, aby złożyć zamówienie.</p>
        <button className="btn btn-primary" onClick={() => navigate('/menu')}>
          Przeglądaj menu
        </button>
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
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="fw-bold mx-1">{item.quantity}</span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                <span className="fw-bold fs-5">{totalAmount.toFixed(2)} zł</span>
              </div>

              <div className="mb-3">
                <label className="form-label">Adres dostawy (opcjonalnie)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Uwagi (opcjonalnie)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Np. brak orzechów, extra sos..."
                />
              </div>

              <button
                className="btn btn-success w-100"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                {submitting ? 'Składanie...' : 'Złóż zamówienie'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
