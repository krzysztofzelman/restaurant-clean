import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './hooks/useCart';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import HomePage from './pages/HomePage';
import KitchenPage from './pages/KitchenPage';
import AdminPage from './pages/AdminPage';
import WarehousePage from './pages/WarehousePage';
import CourierPage from './pages/CourierPage';
import StaffDashboard from './pages/StaffDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/menu" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }
  if (user) {
    // Jeśli przyszedł z innej strony (np. koszyka) – wróć tam
    const from = location.state?.from;
    if (from) return <Navigate to={from} replace />;
    // W przeciwnym razie – przekieruj wg roli
    const roleRedirect = {
      admin: '/admin',
      kitchen: '/kitchen',
      courier: '/courier',
    };
    const redirectPath = roleRedirect[profile?.role] || '/menu';
    return <Navigate to={redirectPath} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
            <KitchenPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warehouse"
        element={
          <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
            <WarehousePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courier"
        element={
          <ProtectedRoute allowedRoles={['courier']}>
            <CourierPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'kitchen', 'courier']}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="min-vh-100 bg-light">
              <AppRoutes />
            </main>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
