import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCourierOrders, updateDeliveryStatus, getCourierHistory } from '../services/api';
import { statusLabels, statusColors } from '../constants/orderStatus';
import type { OrderWithRelations, OrderStatus } from '../lib/database.types';

export default function CourierPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [history, setHistory] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('available');

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const [data, historyData] = await Promise.all([
        getCourierOrders(),
        getCourierHistory(user.id),
      ]);
      setOrders(data);
      setHistory(historyData);
    } catch (err: unknown) {
      setError(
        'Błąd ładowania zamówień: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load + auto-refresh every 15s
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleAssign = async (orderId: string) => {
    if (!user) return;
    try {
      await updateDeliveryStatus(orderId, 'in_transit', user.id);
      await loadOrders();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDelivered = async (orderId: string) => {
    try {
      await updateDeliveryStatus(orderId, 'delivered');
      await loadOrders();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const availableOrders = orders.filter(
    (o) => o.status === 'ready' && !o.courier_id,
  );

  const myDeliveries = orders.filter(
    (o) => o.courier_id === user?.id && o.status === 'in_transit',
  );

  const completedDeliveries = history;

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
        <h2 className="mb-0">Panel dostawcy</h2>
        <span className="text-muted small">Odświeżanie co 15s</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'available' ? 'active' : ''}`}
            onClick={() => setFilter('available')}
          >
            Dostępne ({availableOrders.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Aktywne ({myDeliveries.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Historia ({completedDeliveries.length})
          </button>
        </li>
      </ul>

      {/* ─── Available orders ─── */}
      {filter === 'available' && (
        <>
          {availableOrders.length === 0 ? (
            <p className="text-muted">
              Brak zamówień gotowych do odbioru.
            </p>
          ) : (
            <div className="row g-3">
              {availableOrders.map((order) => (
                <div key={order.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card h-100 shadow-sm border-success">
                    <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                      <span className="fw-bold small">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="badge bg-light text-dark">
                        Gotowe do odbioru
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="mb-1 small">
                        <strong>Klient:</strong>{' '}
                        {order.profiles?.full_name ||
                          order.profiles?.email ||
                          'Nieznany'}
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
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleAssign(order.id)}
                        >
                          Przyjmij dostawę
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Active deliveries ─── */}
      {filter === 'active' && (
        <>
          {myDeliveries.length === 0 ? (
            <p className="text-muted">Brak aktywnych dostaw.</p>
          ) : (
            <div className="row g-3">
              {myDeliveries.map((order) => (
                <div key={order.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card h-100 shadow-sm border-primary">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                      <span className="fw-bold small">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`badge bg-${statusColors[order.status]}`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="mb-1 small">
                        <strong>Klient:</strong>{' '}
                        {order.profiles?.full_name ||
                          order.profiles?.email ||
                          'Nieznany'}
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
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleDelivered(order.id)}
                        >
                          Dostarczone
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Completed deliveries ─── */}
      {filter === 'completed' && (
        <>
          {completedDeliveries.length === 0 ? (
            <p className="text-muted">Brak zrealizowanych dostaw.</p>
          ) : (
            <div className="row g-3">
              {completedDeliveries.map((order) => (
                <div key={order.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card h-100 shadow-sm border-secondary">
                    <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                      <span className="fw-bold small">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="badge bg-success">Dostarczone</span>
                    </div>
                    <div className="card-body">
                      <p className="mb-1 small">
                        <strong>Klient:</strong>{' '}
                        {order.profiles?.full_name ||
                          order.profiles?.email ||
                          'Nieznany'}
                      </p>
                      {order.delivery_address && (
                        <p className="mb-1 small">
                          <strong>Adres:</strong> {order.delivery_address}
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
                      <strong>
                        {Number(order.total_amount).toFixed(2)} zł
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}