import { useEffect, useState } from 'react';
import {
  getAllOrders,
  getAllMenuItems,
  toggleMenuItemAvailability,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllProfiles,
  updateUserRole,
  updateOrderStatus,
  updatePaymentStatus,
} from '../services/api';

const statusLabels = {
  pending: 'Oczekujące',
  confirmed: 'Potwierdzone',
  preparing: 'W przygotowaniu',
  ready: 'Gotowe',
  delivered: 'Dostarczone',
  cancelled: 'Anulowane',
};

const statusColors = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'primary',
  ready: 'success',
  delivered: 'secondary',
  cancelled: 'danger',
};

const nextStatus = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export default function AdminPage() {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New menu item form
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_available: true,
  });

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [o, m, p] = await Promise.all([
        getAllOrders(),
        getAllMenuItems(),
        getAllProfiles(),
      ]);
      setOrders(o);
      setMenuItems(m);
      setProfiles(p);
    } catch (err) {
      setError('Błąd ładowania danych: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handlePaymentToggle = async (orderId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await updatePaymentStatus(orderId, newStatus);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handleToggleAvailability = async (id, current) => {
    try {
      await toggleMenuItemAvailability(id, !current);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        is_available: form.is_available,
      };
      if (editItem) {
        await updateMenuItem(editItem.id, payload);
      } else {
        await addMenuItem(payload);
      }
      setShowForm(false);
      setEditItem(null);
      resetForm();
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      is_available: item.is_available,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Na pewno usunąć to danie?')) return;
    try {
      await deleteMenuItem(id);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: '', is_available: true });
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4">Panel administracyjny</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'orders' ? 'active' : ''}`}
            onClick={() => setTab('orders')}
          >
            Zamówienia ({orders.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'menu' ? 'active' : ''}`}
            onClick={() => setTab('menu')}
          >
            Menu ({menuItems.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            Użytkownicy ({profiles.length})
          </button>
        </li>
      </ul>

      {/* ──────── Orders tab ──────── */}
      {tab === 'orders' && (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Klient</th>
                <th>Data</th>
                <th>Status</th>
                <th>Płatność</th>
                <th>Kwota</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="small">#{o.id.slice(0, 8)}</td>
                  <td>{o.profiles?.full_name || o.profiles?.email || '—'}</td>
                  <td className="small">
                    {new Date(o.created_at).toLocaleString('pl-PL')}
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      <span
                        className={`badge bg-${statusColors[o.status] || 'secondary'}`}
                      >
                        {statusLabels[o.status] || o.status}
                      </span>
                      {nextStatus[o.status] && (
                        <button
                          className="btn btn-outline-success btn-sm py-0 px-1"
                          title={statusLabels[nextStatus[o.status]]}
                          onClick={() => handleStatusChange(o.id, nextStatus[o.status])}
                        >
                          →
                        </button>
                      )}
                      {o.status !== 'cancelled' && o.status !== 'delivered' && (
                        <button
                          className="btn btn-outline-danger btn-sm py-0 px-1"
                          title="Anuluj"
                          onClick={() => handleStatusChange(o.id, 'cancelled')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge bg-${o.payment_status === 'paid' ? 'success' : 'danger'} cursor-pointer`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handlePaymentToggle(o.id, o.payment_status)}
                      title={o.payment_status === 'paid' ? 'Kliknij aby cofnąć płatność' : 'Kliknij aby oznaczyć jako opłacone'}
                    >
                      {o.payment_status === 'paid' ? 'Opłacone' : 'Nieopłacone'}
                    </span>
                  </td>
                  <td className="fw-bold">{o.total_amount.toFixed(2)} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────── Menu tab ──────── */}
      {tab === 'menu' && (
        <div>
          <button
            className="btn btn-primary mb-3"
            onClick={() => {
              setEditItem(null);
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Anuluj' : '+ Dodaj danie'}
          </button>

          {showForm && (
            <div className="card mb-4 shadow-sm">
              <div className="card-body">
                <h5>{editItem ? 'Edytuj danie' : 'Nowe danie'}</h5>
                <form onSubmit={handleSaveMenuItem}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Nazwa</label>
                      <input
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Kategoria</label>
                      <input
                        className="form-control"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        placeholder="np. Obiady, Zupy, Napoje"
                        required
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Cena (zł)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="isAvailable"
                          checked={form.is_available}
                          onChange={(e) =>
                            setForm({ ...form, is_available: e.target.checked })
                          }
                        />
                        <label className="form-check-label" htmlFor="isAvailable">
                          Dostępne
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Opis</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-success">
                        {editItem ? 'Zapisz zmiany' : 'Dodaj'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Kategoria</th>
                  <th>Cena</th>
                  <th>Dostępne</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.price.toFixed(2)} zł</td>
                    <td>
                      <span
                        className={`badge bg-${item.is_available ? 'success' : 'secondary'}`}
                      >
                        {item.is_available ? 'Tak' : 'Nie'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm me-1"
                        onClick={() => handleEdit(item)}
                      >
                        Edytuj
                      </button>
                      <button
                        className="btn btn-outline-warning btn-sm me-1"
                        onClick={() =>
                          handleToggleAvailability(item.id, item.is_available)
                        }
                      >
                        {item.is_available ? 'Ukryj' : 'Pokaż'}
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────── Users tab ──────── */}
      {tab === 'users' && (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nazwa</th>
                <th>Rola</th>
                <th>Aktywny</th>
                <th>Zmień rolę</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>{p.email}</td>
                  <td>{p.full_name || '—'}</td>
                  <td>
                    <span className="badge bg-info">{p.role}</span>
                  </td>
                  <td>
                    <span
                      className={`badge bg-${p.is_active ? 'success' : 'danger'}`}
                    >
                      {p.is_active ? 'Tak' : 'Nie'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 140 }}
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value)}
                    >
                      <option value="user">user</option>
                      <option value="kitchen">kitchen</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
