import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: 'http://localhost:3000/update-password' }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="card shadow-sm" style={{ maxWidth: 440, width: '100%' }}>
          <div className="card-body text-center p-4">
            <div className="mb-3 text-success">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
            <h2 className="mb-3">Sprawdź skrzynkę email</h2>
            <p className="text-muted mb-4">
              Jeśli konto z adresem <strong>{email}</strong> istnieje, wysłaliśmy link do resetowania hasła.
            </p>
            <Link to="/login" className="btn btn-primary">
              Wróć do logowania
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: 440, width: '100%' }}>
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4">Resetowanie hasła</h2>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Adres email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                placeholder="jan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
            </button>
          </form>

          <div className="text-center mt-3">
            <Link to="/login" className="text-decoration-none">
              ← Wróć do logowania
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
