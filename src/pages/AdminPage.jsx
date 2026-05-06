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
  uploadMenuImage,
  getIngredients,
  getMenuItemIngredients,
  addMenuItemIngredient,
  deleteMenuItemIngredient,
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
    image_url: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Recipe modal
  const [recipeModal, setRecipeModal] = useState(null); // menu item object or null
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [recipeLoading, setRecipeLoading] = useState(false);

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
      let imageUrl = form.image_url || null;

      // If a new file was selected, upload it first
      if (imageFile) {
        // For new items, create a temp ID placeholder; for edits use the real ID
        const tempId = editItem ? editItem.id : 'temp-' + Date.now();
        imageUrl = await uploadMenuImage(imageFile, tempId);
      }

      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        is_available: form.is_available,
        image_url: imageUrl,
      };

      let savedItem;
      if (editItem) {
        savedItem = await updateMenuItem(editItem.id, payload);
      } else {
        savedItem = await addMenuItem(payload);
      }

      // If this was a new item uploaded with a temp ID, re-upload under the real ID
      if (imageFile && !editItem) {
        const finalUrl = await uploadMenuImage(imageFile, savedItem.id);
        await updateMenuItem(savedItem.id, { image_url: finalUrl });
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
      image_url: item.image_url || '',
    });
    setImageFile(null);
    setImagePreview(item.image_url || null);
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
    setForm({ name: '', description: '', price: '', category: '', is_available: true, image_url: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      await loadAll();
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  // ─── Recipe modal ───

  const openRecipeModal = async (item) => {
    setRecipeModal(item);
    setNewIngredientId('');
    setNewIngredientQty('');
    setRecipeLoading(true);
    try {
      const [ings, allIngs] = await Promise.all([
        getMenuItemIngredients(item.id),
        getIngredients(),
      ]);
      setRecipeIngredients(ings);
      setAllIngredients(allIngs);
    } catch (err) {
      alert('Błąd ładowania receptury: ' + err.message);
    } finally {
      setRecipeLoading(false);
    }
  };

  const closeRecipeModal = () => {
    setRecipeModal(null);
    setRecipeIngredients([]);
    setAllIngredients([]);
  };

  const handleAddIngredient = async () => {
    if (!newIngredientId || !newIngredientQty) return;
    try {
      const added = await addMenuItemIngredient(
        recipeModal.id,
        newIngredientId,
        parseFloat(newIngredientQty)
      );
      setRecipeIngredients((prev) => [...prev, added]);
      setNewIngredientId('');
      setNewIngredientQty('');
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  };

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Usunąć ten składnik z receptury?')) return;
    try {
      await deleteMenuItemIngredient(id);
      setRecipeIngredients((prev) => prev.filter((ri) => ri.id !== id));
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
                      <label className="form-label">Zdjęcie</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img
                            src={imagePreview}
                            alt="Podgląd"
                            className="rounded border"
                            style={{ maxHeight: 120, objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-2"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                              setForm({ ...form, image_url: '' });
                            }}
                          >
                            Usuń zdjęcie
                          </button>
                        </div>
                      )}
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
                        className="btn btn-outline-info btn-sm me-1"
                        onClick={() => openRecipeModal(item)}
                      >
                        Receptura
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

      {/* ──────── Recipe modal ──────── */}
      {recipeModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeRecipeModal}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Receptura: {recipeModal.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRecipeModal}
                />
              </div>
              <div className="modal-body">
                {recipeLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border" role="status" />
                  </div>
                ) : (
                  <>
                    {/* Existing ingredients */}
                    {recipeIngredients.length === 0 ? (
                      <p className="text-muted">Brak składników w recepturze.</p>
                    ) : (
                      <table className="table table-sm mb-4">
                        <thead>
                          <tr>
                            <th>Składnik</th>
                            <th>Ilość</th>
                            <th>Jednostka</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipeIngredients.map((ri) => (
                            <tr key={ri.id}>
                              <td>{ri.ingredient?.name || '—'}</td>
                              <td>{ri.quantity_needed}</td>
                              <td>{ri.ingredient?.unit || ''}</td>
                              <td>
                                <button
                                  className="btn btn-outline-danger btn-sm py-0"
                                  onClick={() => handleDeleteIngredient(ri.id)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <hr />
                    <h6>Dodaj składnik</h6>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-6">
                        <select
                          className="form-select form-select-sm"
                          value={newIngredientId}
                          onChange={(e) => setNewIngredientId(e.target.value)}
                        >
                          <option value="">— Wybierz składnik —</option>
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit || '—'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm"
                          placeholder="Ilość"
                          value={newIngredientQty}
                          onChange={(e) => setNewIngredientQty(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <button
                          className="btn btn-success btn-sm w-100"
                          disabled={!newIngredientId || !newIngredientQty}
                          onClick={handleAddIngredient}
                        >
                          Dodaj
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
