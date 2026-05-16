import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './hooks/useCart';
import { ToastProvider } from './context/ToastContext';
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
import ReservationsAdmin from './pages/admin/ReservationsAdmin';
import WarehousePage from './pages/WarehousePage';
import CourierPage from './pages/CourierPage';
import StaffDashboard from './pages/StaffDashboard';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import WirtualnyKelner from './components/ai/WirtualnyKelner';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    if (!profile) {
      return (
        <div className="container py-5 text-center">
          <div className="spinner-border" role="status" />
        </div>
      );
    }
    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to="/menu" replace />;
    }
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }
  if (user) {
    const roleRedirect: Record<string, string> = {
      admin: '/admin',
      kitchen: '/kitchen',
      courier: '/courier',
    };
    const redirectPath = roleRedirect[profile?.role || ''] || '/menu';
    return <Navigate to={redirectPath} replace />;
  }
  return <>{children}</>;
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
        path="/admin/reservations"
        element={
          <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
            <ReservationsAdmin />
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
            <ToastProvider>
              <Navbar />
              <main className="min-vh-100 bg-light">
                <AppRoutes />
              </main>
              <WirtualnyKelner />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
