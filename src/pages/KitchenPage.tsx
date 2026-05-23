import { useEffect, useState } from 'react';
import { updateOrderStatus } from '../services/api';
import useOrders from '../hooks/useOrders';
import { statusLabels, statusColors, nextStatus } from '../constants/orderStatus';
import type { OrderStatus } from '../lib/database.types';

export default function KitchenPage() {
  const [filter, setFilter] = useState('active');
  const { orders, loading, error, refresh } = useOrders(10000);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      refresh();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const activeStatuses: OrderStatus[] = ['delivered', 'cancelled'];

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active')
      return !activeStatuses.includes(o.status);
    if (filter === 'delivered') return o.status === 'delivered';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Panel kuchni</h2>
        <span className="text-muted small">Odświeżanie co 10s</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Aktywne (
            {orders.filter((o) => !activeStatuses.includes(o.status)).length}
            )
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Dostarczone
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Anulowane
          </button>
        </li>
      </ul>

      {filteredOrders.length === 0 ? (
        <p className="text-muted">Brak zamówień.</p>
      ) : (
        <div className="row g-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-bold small">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`badge bg-${statusColors[order.status] || 'secondary'}`}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="card-body">
                  <p className="mb-1 small">
                    <strong>Klient:</strong>{' '}
                    {order.profiles?.full_name ||
                      order.profiles?.email ||
                      'Nieznany'}
                  </p>
                  <p className="mb-1 small">
                    <strong>Data:</strong>{' '}
                    {new Date(order.created_at).toLocaleString('pl-PL')}
                  </p>
                  <p className="mb-1 small">
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
                    <p className="mb-1 small">
                      <strong>Adres:</strong> {order.delivery_address}
                    </p>
                  )}
                  {order.notes && (
                    <p className="mb-1 small">
                      <strong>Uwagi:</strong> {order.notes}
                    </p>
                  )}
                  <hr />
                  <h6 className="small">Pozycje:</h6>
                  <ul className="list-unstyled small mb-0">
                    {order.order_items?.map((item) => (
                      <li key={item.id}>
                        {item.quantity}×{' '}
                        {item.menu_item?.name || 'Danie'} –{' '}
                        {Number(item.subtotal).toFixed(2)} zł
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>
                      {Number(order.total_amount).toFixed(2)} zł
                    </strong>
                    <div className="d-flex gap-1 align-items-center">
                      {order.payment_status !== 'paid' && (
                        <span className="badge bg-warning text-dark me-1">
                          Oczekuje na płatność
                        </span>
                      )}
                      {order.payment_status === 'paid' &&
                        nextStatus[order.status] && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              handleStatusChange(
                                order.id,
                                nextStatus[order.status]!,
                              )
                            }
                          >
                            {statusLabels[nextStatus[order.status]!]}
                          </button>
                        )}
                      {order.status !== 'cancelled' &&
                        order.status !== 'delivered' && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() =>
                              handleStatusChange(order.id, 'cancelled')
                            }
                          >
                            Anuluj
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
