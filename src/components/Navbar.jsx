import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CartWidget from './CartWidget';
import useKitchenNotifications from '../hooks/useKitchenNotifications';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const { newOrdersCount } = useKitchenNotifications();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const role = profile?.role || 'user';

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          🍽️ Restauracja
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/menu">
                Menu
              </Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to="/orders">
                  Moje zamówienia
                </Link>
              </li>
            )}
            {(role === 'kitchen' || role === 'admin') && (
              <li className="nav-item">
                <Link className="nav-link" to="/kitchen">
                  Kuchnia
                  {newOrdersCount > 0 && (
                    <span className="badge bg-danger ms-1">{newOrdersCount}</span>
                  )}
                </Link>
              </li>
            )}
            {(role === 'kitchen' || role === 'admin') && (
              <li className="nav-item">
                <Link className="nav-link" to="/warehouse">
                  Magazyn
                </Link>
              </li>
            )}
            {role === 'admin' && (
              <li className="nav-item">
                <Link className="nav-link" to="/admin">
                  Admin
                </Link>
              </li>
            )}
            {role === 'courier' && (
              <li className="nav-item">
                <Link className="nav-link" to="/courier">
                  Dostawy
                </Link>
              </li>
            )}
          </ul>
          <div className="d-flex align-items-center gap-3">
            {role === 'user' && <CartWidget />}
            {user ? (
              <>
                <span className="text-light small">
                  {profile?.full_name || user.email}
                  <span className="badge bg-secondary ms-1">{role}</span>
                </span>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                  Wyloguj
                </button>
              </>
            ) : (
              <Link className="btn btn-outline-light btn-sm" to="/login">
                Zaloguj
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
