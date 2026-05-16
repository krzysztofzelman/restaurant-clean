import { useState } from 'react';
import type { ReservationWithProfile } from '../../lib/database.types';

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

function getCountColor(count: number): string {
  if (count === 0) return 'bg-light text-muted';
  if (count <= 3) return 'bg-success text-white';
  if (count <= 6) return 'bg-warning text-dark';
  return 'bg-danger text-white';
}

interface ReservationCalendarProps {
  reservations: ReservationWithProfile[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

export default function ReservationCalendar({
  reservations,
  selectedDate,
  onDateSelect,
}: ReservationCalendarProps) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // Count reservations per date
  const countByDate = new Map<string, number>();
  for (const r of reservations) {
    countByDate.set(r.date, (countByDate.get(r.date) || 0) + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  // 0=Sun..6=Sat → shift so Mon=0
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: (number | null)[] = [];
  // leading blanks
  for (let i = 0; i < startDow; i++) {
    cells.push(daysInPrevMonth - startDow + i + 1);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  // trailing blanks to fill last row
  const remaining = 7 - (cells.length % 7 || 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push(-d); // negative = next month
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDate = (day: number): string => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  return (
    <div>
      {/* Month navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={prevMonth}>
          ‹ Poprzedni
        </button>
        <h5 className="mb-0">
          {MONTHS[viewMonth]} {viewYear}
        </h5>
        <button className="btn btn-outline-secondary btn-sm" onClick={nextMonth}>
          Następny ›
        </button>
      </div>

      {/* Day headers */}
      <div className="row g-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="col text-center small fw-bold text-muted py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="row g-1">
        {cells.map((cell, idx) => {
          if (cell === null) {
            return <div key={`blank-${idx}`} className="col" />;
          }

          const isCurrent = cell > 0;
          const day = Math.abs(cell);
          const dateStr = isCurrent ? formatDate(day) : '';
          const count = isCurrent ? countByDate.get(dateStr) || 0 : 0;

          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          let cellClass = 'col text-center p-1 rounded position-relative';
          if (!isCurrent) {
            cellClass += ' text-muted opacity-50';
          } else if (isSelected) {
            cellClass += ' border border-primary border-2';
          } else if (isToday) {
            cellClass += ' border border-secondary';
          }

          return (
            <div
              key={idx}
              className={cellClass}
              style={{ minHeight: 70, cursor: isCurrent ? 'pointer' : 'default' }}
              onClick={() => {
                if (isCurrent) {
                  onDateSelect(dateStr === selectedDate ? null : dateStr);
                }
              }}
            >
              <div className="small">{day}</div>
              {isCurrent && (
                <div
                  className={`badge ${getCountColor(count)} d-inline-block mt-1`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {count}
                  {count === 1 ? ' rezerwacja' : ' rezerwacji'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="d-flex gap-3 mt-3 small text-muted justify-content-center">
        <span>
          <span className="badge bg-success me-1">&nbsp;&nbsp;</span> 1–3
        </span>
        <span>
          <span className="badge bg-warning text-dark me-1">&nbsp;&nbsp;</span> 4–6
        </span>
        <span>
          <span className="badge bg-danger me-1">&nbsp;&nbsp;</span> 7+
        </span>
      </div>
    </div>
  );
}
