import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      },
    );

    return () => {
      listener?.subscription.unsubscribe();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są zgodne.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(
        'Hasło zostało zmienione. Za chwilę nastąpi przekierowanie...',
      );
      redirectTimer.current = setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 2000);
    }
  };

  if (!ready) {
    return (
      <div
        className="container d-flex justify-content-center align-items-center"
        style={{ minHeight: '60vh' }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            role="status"
          >
            <span className="visually-hidden">Ładowanie...</span>
          </div>
          <p className="text-muted">
            Weryfikacja linku resetującego...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ minHeight: '60vh' }}
    >
      <div
        className="card shadow-sm"
        style={{ maxWidth: 440, width: '100%' }}
      >
        <div className="card-body p-4">
          <h2 className="card-title text-center mb-4">
            Ustaw nowe hasło
          </h2>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Nowe hasło
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                placeholder="Minimum 6 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="mb-3">
              <label
                htmlFor="confirmPassword"
                className="form-label"
              >
                Potwierdź nowe hasło
              </label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                placeholder="Wpisz ponownie hasło"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? 'Zapisywanie...' : 'Zmień hasło'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
