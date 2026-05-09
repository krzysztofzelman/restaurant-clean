import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);
  const state = location.state as LocationState | null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      setSuccess(
        'Konto utworzone! Sprawdź skrzynkę email, aby potwierdzić rejestrację (jeśli wymagane). Za chwilę zostaniesz przekierowany.',
      );
      const fromState = state?.from
        ? { state: { from: state.from } as LocationState }
        : {};
      redirectTimer.current = setTimeout(() => navigate('/login', fromState), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Błąd rejestracji',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 450 }}>
      <h2 className="text-center mb-4">Rejestracja</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Imię i nazwisko</label>
          <input
            type="text"
            className="form-control"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Hasło (min. 6 znaków)</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <button className="btn btn-success w-100" disabled={loading}>
          {loading ? 'Rejestracja...' : 'Zarejestruj'}
        </button>
      </form>
      <p className="text-center mt-3">
        Masz już konto?{' '}
        <Link
          to="/login"
          state={
            (location.state as LocationState)?.from
              ? { from: (location.state as LocationState).from }
              : undefined
          }
        >
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
