import { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { useToast } from '../../context/ToastContext';
import { getAllReservations } from '../../services/api';
import ReservationList from '../../components/admin/ReservationList';
import ReservationCalendar from '../../components/admin/ReservationCalendar';
import ReservationModal from '../../components/admin/ReservationModal';
import type { ReservationWithProfile } from '../../lib/database.types';

type Tab = 'list' | 'calendar';

export default function ReservationsAdmin() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [reservations, setReservations] = useState<ReservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modal
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchReservations = useCallback(async () => {
    startTransition(() => setLoading(true));
    try {
      const data = await getAllReservations();
      startTransition(() => setReservations(data));
    } catch (err) {
      showToast('Błąd ładowania rezerwacji', 'danger');
      console.error(err);
    } finally {
      startTransition(() => setLoading(false));
    }
  }, [showToast]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Client-side filtered list for the list view
  const filteredReservations = useMemo(() => {
    let filtered = reservations;

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((r) => {
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        return true;
      });
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    return filtered;
  }, [reservations, startDate, endDate, statusFilter]);

  const handleDateSelect = (date: string | null) => {
    if (date === selectedDate) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      setStartDate(date || '');
      setEndDate(date || '');
      setActiveTab('list');
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (selectedDate && value !== selectedDate) {
      setSelectedDate(null);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (selectedDate && value !== selectedDate) {
      setSelectedDate(null);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleSortOrderChange = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleSelectReservation = (r: ReservationWithProfile) => {
    setSelectedReservation(r);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedReservation(null);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Rezerwacje</h2>
        <span className="badge bg-secondary fs-6">
          {reservations.length} łącznie
        </span>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📋 Lista
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Kalendarz
          </button>
        </li>
      </ul>

      {/* Tab content */}
      {activeTab === 'list' && (
        <ReservationList
          reservations={filteredReservations}
          loading={loading}
          startDate={startDate}
          endDate={endDate}
          statusFilter={statusFilter}
          sortOrder={sortOrder}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onStatusFilterChange={handleStatusFilterChange}
          onSortOrderChange={handleSortOrderChange}
          onSelectReservation={handleSelectReservation}
          onRefresh={fetchReservations}
        />
      )}

      {activeTab === 'calendar' && (
        <ReservationCalendar
          reservations={reservations}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      )}

      {/* Modal */}
      <ReservationModal
        reservation={selectedReservation}
        show={modalOpen}
        onClose={handleCloseModal}
        onRefresh={fetchReservations}
      />
    </div>
  );
}
