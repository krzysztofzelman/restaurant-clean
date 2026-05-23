import type { OrderWithRelations, OrderStatus } from '../../lib/database.types';
import { statusLabels, statusColors, nextStatus } from '../../constants/orderStatus';

interface Props {
  orders: OrderWithRelations[];
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onPaymentToggle: (orderId: string, currentStatus: string) => void;
}

export default function AdminOrdersTab({ orders, onStatusChange, onPaymentToggle }: Props) {
  return (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Klient</th>
            <th>Data</th>
            <th>Status</th>
            <th>Płatność</th>
            <th>Kwota</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="small">#{o.id.slice(0, 8)}</td>
              <td>{o.profiles?.full_name || o.profiles?.email || '—'}</td>
              <td className="small">
                {new Date(o.created_at).toLocaleString('pl-PL')}
              </td>
              <td>
                <div className="d-flex align-items-center gap-1 flex-wrap">
                  <span className={`badge bg-${statusColors[o.status] || 'secondary'}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                  {nextStatus[o.status] && (
                    <button
                      className="btn btn-outline-success btn-sm py-0 px-1"
                      title={statusLabels[nextStatus[o.status]!]}
                      onClick={() => onStatusChange(o.id, nextStatus[o.status]!)}
                    >
                      →
                    </button>
                  )}
                  {o.status !== 'cancelled' && o.status !== 'delivered' && (
                    <button
                      className="btn btn-outline-danger btn-sm py-0 px-1"
                      title="Anuluj"
                      onClick={() => onStatusChange(o.id, 'cancelled')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </td>
              <td>
                <span
                  className={`badge bg-${o.payment_status === 'paid' ? 'success' : 'danger'} cursor-pointer`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onPaymentToggle(o.id, o.payment_status)}
                  title={
                    o.payment_status === 'paid'
                      ? 'Kliknij aby cofnąć płatność'
                      : 'Kliknij aby oznaczyć jako opłacone'
                  }
                >
                  {o.payment_status === 'paid' ? 'Opłacone' : 'Nieopłacone'}
                </span>
              </td>
              <td className="fw-bold">{Number(o.total_amount).toFixed(2)} zł</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
