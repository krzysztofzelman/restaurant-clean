import { Link } from 'react-router-dom';

export default function UpdatePasswordPage() {
  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ minHeight: '60vh' }}
    >
      <div
        className="card shadow-sm"
        style={{ maxWidth: 440, width: '100%' }}
      >
        <div className="card-body text-center p-4">
          <div className="mb-3 text-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
            </svg>
          </div>
          <h2 className="mb-3">Aktualizacja hasła</h2>
          <p className="text-muted mb-4">
            Funkcja zmiany hasła przez link resetujący jest dostępna
            wyłącznie w wersji Supabase. W wersji samodzielnie
            hostowanej skontaktuj się z administratorem w celu zmiany
            hasła.
          </p>
          <Link to="/login" className="btn btn-primary">
            ← Wróć do logowania
          </Link>
        </div>
      </div>
    </div>
  );
}
