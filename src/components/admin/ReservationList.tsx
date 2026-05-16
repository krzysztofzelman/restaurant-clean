import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { updateReservationStatus } from '../../services/api';
import type { ReservationWithProfile } from '../../lib/database.types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Oczekująca',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-warning text-dark',
  confirmed: 'bg-success',
  cancelled: 'bg-danger',
};

const STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie' },
  { value: 'pending', label: 'Oczekujące' },
  { value: 'confirmed', label: 'Potwierdzone' },
  { value: 'cancelled', label: 'Anulowane' },
];

interface ReservationListProps {
  reservations: ReservationWithProfile[];
  loading: boolean;
  startDate: string;
  endDate: string;
  statusFilter: string;
  sortOrder: 'asc' | 'desc';
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSortOrderChange: () => void;
  onSelectReservation: (reservation: ReservationWithProfile) => void;
  onRefresh: () => void;
}

export default function ReservationList({
  reservations,
  loading,
  startDate,
  endDate,
  statusFilter,
  sortOrder,
  onStartDateChange,
  onEndDateChange,
  onStatusFilterChange,
  onSortOrderChange,
  onSelectReservation,
  onRefresh,
}: ReservationListProps) {
  const { showToast } = useToast();
  const [processingIds, setProcessingIds] = useState<
    Record<string, 'confirm' | 'cancel' | null>
  >({});

  const handleConfirm = async (id: string) => {
    setProcessingIds((prev) => ({ ...prev, [id]: 'confirm' }));
    try {
      await updateReservationStatus(id, 'confirmed');
      showToast('Rezerwacja potwierdzona', 'success');
      onRefresh();
    } catch (err) {
      showToast('Błąd podczas potwierdzania rezerwacji', 'danger');
      console.error(err);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleCancel = async (id: string) => {
    setProcessingIds((prev) => ({ ...prev, [id]: 'cancel' }));
    try {
      await updateReservationStatus(id, 'cancelled');
      showToast('Rezerwacja anulowana', 'success');
      onRefresh();
    } catch (err) {
      showToast('Błąd podczas anulowania rezerwacji', 'danger');
      console.error(err);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: null }));
    }
  };

  const sorted = [...reservations].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return sortOrder === 'asc' ? dateCmp : -dateCmp;
    return sortOrder === 'asc'
      ? a.time.localeCompare(b.time)
      : -b.time.localeCompare(a.time);
  });

  const renderActionButtons = (r: ReservationWithProfile) => {
    const processing = processingIds[r.id];
    return (
      <div className="d-flex gap-1 flex-nowrap">
        {r.status === 'pending' && (
          <button
            className="btn btn-sm btn-outline-success"
            title="Potwierdź"
            disabled={!!processing}
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm(r.id);
            }}
          >
            {processing === 'confirm' ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              '✅'
            )}
          </button>
        )}
        {(r.status === 'pending' || r.status === 'confirmed') && (
          <button
            className="btn btn-sm btn-outline-danger"
            title="Anuluj"
            disabled={!!processing}
            onClick={(e) => {
              e.stopPropagation();
              handleCancel(r.id);
            }}
          >
            {processing === 'cancel' ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              '❌'
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Filters */}
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-6 col-md-3">
          <label className="form-label small text-muted mb-1">Od daty</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small text-muted mb-1">Do daty</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small text-muted mb-1">Status</label>
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3 d-flex align-items-end">
          <button
            className="btn btn-sm btn-outline-secondary w-100"
            onClick={onSortOrderChange}
            title={
              sortOrder === 'desc'
                ? 'Sortuj od najstarszych'
                : 'Sortuj od najnowszych'
            }
          >
            {sortOrder === 'desc' ? '📅 Najnowsze' : '📅 Najstarsze'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <div className="text-center py-5 text-muted">
          <p className="mb-0 fs-5">Brak rezerwacji</p>
          <small>Spróbuj zmienić kryteria filtrowania</small>
        </div>
      )}

      {/* Desktop table */}
      {!loading && sorted.length > 0 && (
        <>
          <div className="d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Data</th>
                    <th>Godzina</th>
                    <th>Osoby</th>
                    <th>Klient</th>
                    <th>Status</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr
                      key={r.id}
                      role="button"
                      className="cursor-pointer"
                      onClick={() => onSelectReservation(r)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        {new Date(
                          r.date + 'T00:00:00',
                        ).toLocaleDateString('pl-PL')}
                      </td>
                      <td>{r.time.slice(0, 5)}</td>
                      <td>{r.guests}</td>
                      <td className="text-truncate" style={{ maxWidth: 200 }}>
                        {r.profiles?.email || '—'}
                      </td>
                      <td>
                        <span
                          className={`badge ${STATUS_BADGES[r.status]}`}
                        >
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {renderActionButtons(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="d-md-none">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="card mb-2 shadow-sm"
                role="button"
                onClick={() => onSelectReservation(r)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <strong>
                        {new Date(
                          r.date + 'T00:00:00',
                        ).toLocaleDateString('pl-PL')}
                      </strong>
                      <span className="ms-2 text-muted">
                        {r.time.slice(0, 5)}
                      </span>
                    </div>
                    <span className={`badge ${STATUS_BADGES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <div className="small text-muted">
                    {r.guests}{' '}
                    {r.guests === 1 ? 'osoba' : r.guests < 5 ? 'osoby' : 'osób'}{' '}
                    · {r.profiles?.email || '—'}
                  </div>
                  <div
                    className="mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActionButtons(r)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
