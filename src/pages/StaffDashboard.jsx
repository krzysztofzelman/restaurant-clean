import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllOrders, updateOrderStatus, getCourierOrders, getCourierHistory, updateDeliveryStatus } from '../services/api';

export default function StaffDashboard() {
  const { user, profile } = useAuth();
  const role = profile?.role;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Panel pracownika</h2>
        <span className="badge bg-secondary fs-6">
          {role === 'admin' ? 'Administrator' : role === 'kitchen' ? 'Kuchnia' : 'Kurier'}
        </span>
      </div>

      {role === 'admin' && <AdminDashboard />}
      {role === 'kitchen' && <KitchenDashboard />}
      {role === 'courier' && <CourierDashboard user={user} />}
    </div>
  );
}

/* ────────────── Admin Dashboard ────────────── */

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Błąd ładowania zamówień:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
  const todayRevenue = todayOrders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const inProgressOrders = orders.filter((o) =>
    ['confirmed', 'preparing', 'ready', 'in_transit'].includes(o.status)
  );
  const recentOrders = orders.slice(0, 10);

  const statusLabels = {
    pending: 'Oczekujące',
    confirmed: 'Potwierdzone',
    preparing: 'W przygotowaniu',
    ready: 'Gotowe',
    in_transit: 'W dostawie',
    delivered: 'Dostarczone',
    cancelled: 'Anulowane',
  };

  const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'primary',
    ready: 'success',
    in_transit: 'primary',
    delivered: 'secondary',
    cancelled: 'danger',
  };

  const paymentLabels = {
    unpaid: 'Nieopłacone',
    paid: 'Opłacone',
    refunded: 'Zwrócone',
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <>
      {/* Statystyki */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-primary text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{todayOrders.length}</h5>
              <p className="mb-0 small">Zamówień dzisiaj</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-success text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{todayRevenue.toFixed(2)} zł</h5>
              <p className="mb-0 small">Przychód dzisiaj</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-warning text-dark shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{pendingOrders.length}</h5>
              <p className="mb-0 small">Oczekujące</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card bg-info text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{inProgressOrders.length}</h5>
              <p className="mb-0 small">W trakcie realizacji</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ostatnie zamówienia */}
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Ostatnie zamówienia</h5>
          <span className="text-muted small">Ostatnie 10</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Klient</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Płatność</th>
                  <th className="text-end">Kwota</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Brak zamówień
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="text-muted small">{order.id.slice(0, 8)}</td>
                      <td>{order.profiles?.full_name || order.profiles?.email || '—'}</td>
                      <td className="small">
                        {new Date(order.created_at).toLocaleString('pl-PL')}
                      </td>
                      <td>
                        <span className={`badge bg-${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge bg-${order.payment_status === 'paid' ? 'success' : order.payment_status === 'refunded' ? 'danger' : 'secondary'}`}>
                          {paymentLabels[order.payment_status]}
                        </span>
                      </td>
                      <td className="text-end fw-bold">
                        {Number(order.total_amount).toFixed(2)} zł
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────── Kitchen Dashboard ────────────── */

function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Błąd ładowania zamówień:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const toPrepare = orders.filter((o) => ['confirmed', 'preparing'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const handleStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const nextStatus = {
    confirmed: 'preparing',
    preparing: 'ready',
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <>
      {/* Podsumowanie */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6">
          <div className="card bg-warning text-dark shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{toPrepare.length}</h5>
              <p className="mb-0 small">Do przygotowania</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6">
          <div className="card bg-success text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{readyOrders.length}</h5>
              <p className="mb-0 small">Gotowe do odbioru</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zamówienia do przygotowania */}
      <h5 className="mb-3">Do przygotowania</h5>
      {toPrepare.length === 0 ? (
        <p className="text-muted">Brak zamówień do przygotowania.</p>
      ) : (
        <div className="row g-3 mb-4">
          {toPrepare.map((order) => (
            <div key={order.id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100 shadow-sm">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-bold small">#{order.id.slice(0, 8)}</span>
                  <span className={`badge bg-${order.status === 'confirmed' ? 'info' : 'primary'}`}>
                    {order.status === 'confirmed' ? 'Potwierdzone' : 'W przygotowaniu'}
                  </span>
                </div>
                <div className="card-body">
                  <p className="mb-1 small">
                    <strong>Klient:</strong>{' '}
                    {order.profiles?.full_name || order.profiles?.email || 'Nieznany'}
                  </p>
                  <p className="mb-1 small">
                    <strong>Data:</strong>{' '}
                    {new Date(order.created_at).toLocaleString('pl-PL')}
                  </p>
                  {order.notes && (
                    <p className="mb-1 small">
                      <strong>Uwagi:</strong> {order.notes}
                    </p>
                  )}
                  <hr />
                  <ul className="list-unstyled small mb-0">
                    {order.order_items?.map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.menu_item?.name || 'Danie'} –{' '}
                        {Number(item.subtotal).toFixed(2)} zł
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card-footer d-flex justify-content-between align-items-center">
                  <strong>{Number(order.total_amount).toFixed(2)} zł</strong>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleStatus(order.id, nextStatus[order.status])}
                  >
                    {order.status === 'confirmed' ? 'Rozpocznij' : 'Oznacz gotowe'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gotowe do odbioru */}
      {readyOrders.length > 0 && (
        <>
          <h5 className="mb-3">Gotowe do odbioru</h5>
          <div className="row g-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="col-12 col-md-6 col-xl-4">
                <div className="card h-100 shadow-sm border-success">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <span className="fw-bold small">#{order.id.slice(0, 8)}</span>
                    <span className="badge bg-light text-dark">Gotowe</span>
                  </div>
                  <div className="card-body">
                    <p className="mb-1 small">
                      <strong>Klient:</strong>{' '}
                      {order.profiles?.full_name || order.profiles?.email || 'Nieznany'}
                    </p>
                    <p className="mb-1 small">
                      <strong>Data:</strong>{' '}
                      {new Date(order.created_at).toLocaleString('pl-PL')}
                    </p>
                    <hr />
                    <ul className="list-unstyled small mb-0">
                      {order.order_items?.map((item) => (
                        <li key={item.id}>
                          {item.quantity}× {item.menu_item?.name || 'Danie'} –{' '}
                          {Number(item.subtotal).toFixed(2)} zł
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card-footer">
                    <strong>{Number(order.total_amount).toFixed(2)} zł</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ────────────── Courier Dashboard ────────────── */

function CourierDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const [data, historyData] = await Promise.all([
        getCourierOrders(),
        getCourierHistory(user.id),
      ]);
      setOrders(data);
      setHistory(historyData);
    } catch (err) {
      console.error('Błąd ładowania zamówień:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const availableOrders = orders.filter(
    (o) => o.status === 'ready' && !o.courier_id
  );
  const myDeliveries = orders.filter(
    (o) => o.courier_id === user.id && o.status === 'in_transit'
  );

  const handleAssign = async (orderId) => {
    try {
      await updateDeliveryStatus(orderId, 'in_transit', user.id);
      await loadOrders();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handleDelivered = async (orderId) => {
    try {
      await updateDeliveryStatus(orderId, 'delivered');
      await loadOrders();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  const renderOrderCard = (order, type) => {
    const isAvailable = type === 'available';
    const borderClass = isAvailable ? 'border-success' : 'border-primary';
    const headerBg = isAvailable ? 'bg-success text-white' : 'bg-primary text-white';

    return (
      <div key={order.id} className="col-12 col-md-6 col-xl-4">
        <div className={`card h-100 shadow-sm ${borderClass}`}>
          <div className={`card-header d-flex justify-content-between align-items-center ${headerBg}`}>
            <span className="fw-bold small">#{order.id.slice(0, 8)}</span>
            <span className={`badge bg-${isAvailable ? 'light text-dark' : 'light text-dark'}`}>
              {isAvailable ? 'Gotowe do odbioru' : 'W drodze'}
            </span>
          </div>
          <div className="card-body">
            <p className="mb-1 small">
              <strong>Klient:</strong>{' '}
              {order.profiles?.full_name || order.profiles?.email || 'Nieznany'}
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
            <ul className="list-unstyled small mb-0">
              {order.order_items?.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.menu_item?.name || 'Danie'} –{' '}
                  {Number(item.subtotal).toFixed(2)} zł
                </li>
              ))}
            </ul>
          </div>
          <div className="card-footer d-flex justify-content-between align-items-center">
            <strong>{Number(order.total_amount).toFixed(2)} zł</strong>
            {isAvailable ? (
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleAssign(order.id)}
              >
                Przyjmij dostawę
              </button>
            ) : (
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleDelivered(order.id)}
              >
                Dostarczone
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Podsumowanie */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6">
          <div className="card bg-success text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{availableOrders.length}</h5>
              <p className="mb-0 small">Dostępnych dostaw</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6">
          <div className="card bg-primary text-white shadow-sm h-100">
            <div className="card-body text-center">
              <h5 className="card-title fs-1 mb-0">{myDeliveries.length}</h5>
              <p className="mb-0 small">Aktywnych dostaw</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dostępne dostawy */}
      <h5 className="mb-3">Dostępne dostawy</h5>
      {availableOrders.length === 0 ? (
        <p className="text-muted mb-4">Brak zamówień gotowych do odbioru.</p>
      ) : (
        <div className="row g-3 mb-4">
          {availableOrders.map((o) => renderOrderCard(o, 'available'))}
        </div>
      )}

      {/* Aktywne dostawy */}
      <h5 className="mb-3">Aktywne dostawy</h5>
      {myDeliveries.length === 0 ? (
        <p className="text-muted mb-4">Brak aktywnych dostaw.</p>
      ) : (
        <div className="row g-3 mb-4">
          {myDeliveries.map((o) => renderOrderCard(o, 'active'))}
        </div>
      )}

      {/* Historia */}
      {history.length > 0 && (
        <>
          <h5 className="mb-3">Zrealizowane dzisiaj</h5>
          <div className="row g-3">
            {history.slice(0, 5).map((order) => (
              <div key={order.id} className="col-12 col-md-6 col-xl-4">
                <div className="card h-100 shadow-sm border-secondary">
                  <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                    <span className="fw-bold small">#{order.id.slice(0, 8)}</span>
                    <span className="badge bg-success">Dostarczone</span>
                  </div>
                  <div className="card-body small">
                    <p className="mb-1">
                      <strong>Klient:</strong>{' '}
                      {order.profiles?.full_name || order.profiles?.email || 'Nieznany'}
                    </p>
                    {order.delivery_address && (
                      <p className="mb-0">
                        <strong>Adres:</strong> {order.delivery_address}
                      </p>
                    )}
                  </div>
                  <div className="card-footer">
                    <strong>{Number(order.total_amount).toFixed(2)} zł</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
