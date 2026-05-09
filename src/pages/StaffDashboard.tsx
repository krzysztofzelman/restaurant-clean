import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllOrders,
  getWarehouseStats,
  trackRevenue,
} from '../services/api';
import type { OrderWithRelations, OrderStatus } from '../lib/database.types';

interface WarehouseStat {
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
}

interface RevenueData {
  today: number | null;
  week: number | null;
  month: number | null;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Oczekujące',
  confirmed: 'Potwierdzone',
  preparing: 'W przygotowaniu',
  ready: 'Gotowe',
  in_transit: 'W drodze',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'success',
  in_transit: 'dark',
  delivered: 'secondary',
  cancelled: 'danger',
};

export default function StaffDashboard() {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStat | null>(
    null,
  );
  const [revenue, setRevenue] = useState<RevenueData>({
    today: null,
    week: null,
    month: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [ordersData, warehouseData, revenueData] = await Promise.all([
        getAllOrders(),
        getWarehouseStats().catch(() => null),
        trackRevenue(),
      ]);
      setOrders(ordersData);
      setWarehouseStats(warehouseData);
      setRevenue({
        today: revenueData.today,
        week: revenueData.week ?? null,
        month: revenueData.month,
      });
    } catch (err: unknown) {
      setError(
        'Błąd ładowania danych: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const inTransitOrders = orders.filter((o) => o.status === 'in_transit');

  return (
    <div className="container py-4">
      <h2 className="mb-4">Panel zarządzania</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Dashboard cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card text-bg-warning h-100 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-0">{pendingOrders.length}</h3>
              <small>Oczekujące</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-bg-primary h-100 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-0">{preparingOrders.length}</h3>
              <small>W przygotowaniu</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-bg-success h-100 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-0">{readyOrders.length}</h3>
              <small>Gotowe</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-bg-dark h-100 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-0">{inTransitOrders.length}</h3>
              <small>W drodze</small>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Warehouse stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Przychód</h5>
              <div className="row text-center mt-3">
                <div className="col-4">
                  <strong className="fs-5">
                    {Number(revenue.today ?? 0).toFixed(2)} zł
                  </strong>
                  <br />
                  <small className="text-muted">Dzisiaj</small>
                </div>
                <div className="col-4">
                  <strong className="fs-5">
                    {Number(revenue.week ?? 0).toFixed(2)} zł
                  </strong>
                  <br />
                  <small className="text-muted">Ten tydzień</small>
                </div>
                <div className="col-4">
                  <strong className="fs-5">
                    {Number(revenue.month ?? 0).toFixed(2)} zł
                  </strong>
                  <br />
                  <small className="text-muted">Ten miesiąc</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <Link to="/warehouse" className="text-decoration-none">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Magazyn</h5>
                <div className="row text-center mt-3">
                  <div className="col-4">
                    <strong
                      className={`fs-5 ${(warehouseStats?.low_stock_count ?? 0) > 0 ? 'text-warning' : 'text-success'}`}
                    >
                      {warehouseStats?.low_stock_count ?? '—'}
                    </strong>
                    <br />
                    <small className="text-muted">Niski stan</small>
                  </div>
                  <div className="col-4">
                    <strong
                      className={`fs-5 ${(warehouseStats?.expiring_soon_count ?? 0) > 0 ? 'text-warning' : 'text-success'}`}
                    >
                      {warehouseStats?.expiring_soon_count ?? '—'}
                    </strong>
                    <br />
                    <small className="text-muted">
                      Wkrótce wygaśnie
                    </small>
                  </div>
                  <div className="col-4">
                    <strong
                      className={`fs-5 ${(warehouseStats?.expired_count ?? 0) > 0 ? 'text-danger' : 'text-success'}`}
                    >
                      {warehouseStats?.expired_count ?? '—'}
                    </strong>
                    <br />
                    <small className="text-muted">Przeterminowane</small>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Latest orders */}
      <h5 className="mb-3">Ostatnie zamówienia</h5>
      {orders.length === 0 ? (
        <p className="text-muted">Brak zamówień.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Klient</th>
                <th>Status</th>
                <th>Płatność</th>
                <th>Kwota</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="font-monospace small">
                    #{order.id.slice(0, 8)}
                  </td>
                  <td>
                    {order.profiles?.full_name ||
                      order.profiles?.email ||
                      '—'}
                  </td>
                  <td>
                    <span
                      className={`badge bg-${statusColors[order.status] || 'secondary'}`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge bg-${order.payment_status === 'paid' ? 'success' : 'danger'}`}
                    >
                      {order.payment_status === 'paid'
                        ? 'Opłacone'
                        : 'Nieopłacone'}
                    </span>
                  </td>
                  <td className="fw-bold">
                    {Number(order.total_amount).toFixed(2)} zł
                  </td>
                  <td className="small">
                    {new Date(order.created_at).toLocaleString('pl-PL')}
                  </td>
                  <td>
                    <Link
                      to={`/orders/${order.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Szczegóły
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
