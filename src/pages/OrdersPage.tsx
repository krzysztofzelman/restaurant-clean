import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyOrders } from '../services/api';
import { statusLabels, statusColors } from '../constants/orderStatus';
import type { OrderWithRelations } from '../lib/database.types';

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    getMyOrders(user.id)
      .then((data) => {
        setOrders(data);
      })
      .catch((err: unknown) => {
        setError(
          'Nie udało się załadować zamówień: ' +
            (err instanceof Error ? err.message : String(err)),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Moje zamówienia</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {orders.length === 0 ? (
        <p className="text-muted">Nie masz jeszcze żadnych zamówień.</p>
      ) : (
        <div className="row g-4">
          {orders.map((order) => (
            <div key={order.id} className="col-12">
              <div className="card shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-bold">
                    Zamówienie #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`badge bg-${statusColors[order.status] || 'secondary'}`}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Data:</strong>{' '}
                        {new Date(order.created_at).toLocaleString('pl-PL')}
                      </p>
                      <p className="mb-1">
                        <strong>Płatność:</strong>{' '}
                        <span
                          className={`badge bg-${order.payment_status === 'paid' ? 'success' : 'danger'}`}
                        >
                          {order.payment_status === 'paid'
                            ? 'Opłacone'
                            : 'Nieopłacone'}
                        </span>
                      </p>
                      {order.delivery_address && (
                        <p className="mb-1">
                          <strong>Adres:</strong> {order.delivery_address}
                        </p>
                      )}
                      {order.notes && (
                        <p className="mb-1">
                          <strong>Uwagi:</strong> {order.notes}
                        </p>
                      )}
                    </div>
                    <div className="col-md-6">
                      <h6>Pozycje:</h6>
                      <ul className="list-unstyled mb-0">
                        {order.order_items?.map((item) => (
                          <li key={item.id} className="small">
                            {item.quantity}×{' '}
                            {item.menu_item?.name || 'Danie'} –{' '}
                            {Number(item.subtotal).toFixed(2)} zł
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between align-items-center">
                  <div>
                    {order.payment_status !== 'paid' &&
                      (order.status === 'pending' ||
                        order.status === 'confirmed') && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/cart')}
                        >
                          Zapłać teraz
                        </button>
                      )}
                  </div>
                  <strong>{Number(order.total_amount).toFixed(2)} zł</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
