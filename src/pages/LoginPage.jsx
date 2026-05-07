import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const testAccounts = [
  { role: 'Administrator', email: 'admin@restauracja.pl', password: 'admin123' },
  { role: 'Kuchnia', email: 'kitchen@restauracja.pl', password: 'kitchen123' },
  { role: 'Kurier', email: 'kurier@restauracja.pl', password: 'kurier123' },
  { role: 'Klient', email: 'jan@example.com', password: 'user123' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const passwordReset = location.state?.passwordReset;

  const fillCredentials = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    // Auto-submit after a short delay to let state update
    setTimeout(() => {
      document.getElementById('login-form').requestSubmit();
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/menu');
    } catch (err) {
      setError(err.message || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 450 }}>
      <h2 className="text-center mb-4">Zaloguj się</h2>
      {passwordReset && (
        <div className="alert alert-success">Hasło zostało pomyślnie zmienione. Możesz się zalogować nowym hasłem.</div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      <form id="login-form" onSubmit={handleSubmit}>
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
          <label className="form-label">Hasło</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
        <div className="text-center mt-2">
          <Link to="/reset-password" className="text-decoration-none small">
            Zapomniałem hasła
          </Link>
        </div>
      </form>
      <p className="text-center mt-3">
        Nie masz konta? <Link to="/register">Zarejestruj się</Link>
      </p>

      <div className="mt-4 p-3 rounded" style={{ backgroundColor: '#f0f0f0', fontSize: '0.85rem' }}>
        <p className="mb-2 fw-semibold text-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
          KONTA TESTOWE
        </p>
        <table className="table table-sm table-borderless mb-0" style={{ cursor: 'pointer' }}>
          <thead>
            <tr>
              <th className="text-secondary small fw-normal">Rola</th>
              <th className="text-secondary small fw-normal">Email</th>
              <th className="text-secondary small fw-normal">Hasło</th>
            </tr>
          </thead>
          <tbody>
            {testAccounts.map((acc) => (
              <tr key={acc.email} onClick={() => fillCredentials(acc)} className="align-middle">
                <td className="fw-medium">{acc.role}</td>
                <td className="font-monospace small">{acc.email}</td>
                <td className="font-monospace small text-muted">{acc.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
