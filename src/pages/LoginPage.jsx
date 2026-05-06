import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const passwordReset = location.state?.passwordReset;

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
      <form onSubmit={handleSubmit}>
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
    </div>
  );
}
