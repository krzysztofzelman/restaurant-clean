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

interface ReservationModalProps {
  reservation: ReservationWithProfile | null;
  show: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ReservationModal({
  reservation,
  show,
  onClose,
  onRefresh,
}: ReservationModalProps) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!reservation) return null;
  if (!show) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await updateReservationStatus(reservation.id, 'confirmed');
      showToast('Rezerwacja potwierdzona', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      showToast('Błąd podczas potwierdzania rezerwacji', 'danger');
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await updateReservationStatus(reservation.id, 'cancelled');
      showToast('Rezerwacja anulowana', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      showToast('Błąd podczas anulowania rezerwacji', 'danger');
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const clientName = reservation.profiles?.full_name;
  const clientEmail = reservation.profiles?.email;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Szczegóły rezerwacji</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <span className={`badge ${STATUS_BADGES[reservation.status]}`}>
                  {STATUS_LABELS[reservation.status]}
                </span>
              </div>

              <dl className="row mb-0">
                <dt className="col-sm-5">Data</dt>
                <dd className="col-sm-7">
                  {new Date(reservation.date + 'T00:00:00').toLocaleDateString(
                    'pl-PL',
                    {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </dd>

                <dt className="col-sm-5">Godzina</dt>
                <dd className="col-sm-7">{reservation.time.slice(0, 5)}</dd>

                <dt className="col-sm-5">Liczba gości</dt>
                <dd className="col-sm-7">{reservation.guests}</dd>

                <dt className="col-sm-5">Klient</dt>
                <dd className="col-sm-7">
                  {clientName ? (
                    <>
                      {clientName}
                      <br />
                      <small className="text-muted">{clientEmail}</small>
                    </>
                  ) : (
                    clientEmail || '—'
                  )}
                </dd>

                <dt className="col-sm-5">Notatki</dt>
                <dd className="col-sm-7">
                  {reservation.notes || (
                    <em className="text-muted">brak</em>
                  )}
                </dd>

                <dt className="col-sm-5">Utworzono</dt>
                <dd className="col-sm-7">
                  {new Date(reservation.created_at).toLocaleString('pl-PL')}
                </dd>
              </dl>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Zamknij
              </button>
              {reservation.status === 'pending' && (
                <>
                  <button
                    className="btn btn-success"
                    onClick={handleConfirm}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Potwierdzanie...
                      </>
                    ) : (
                      '✅ Potwierdź'
                    )}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Anulowanie...
                      </>
                    ) : (
                      '❌ Anuluj'
                    )}
                  </button>
                </>
              )}
              {reservation.status === 'confirmed' && (
                <button
                  className="btn btn-danger"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Anulowanie...
                    </>
                  ) : (
                    '❌ Anuluj'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
