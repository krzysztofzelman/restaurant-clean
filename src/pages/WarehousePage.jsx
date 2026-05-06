import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getIngredients,
  getIngredientBatches,
  addIngredient,
  addBatch,
} from '../services/api';

const CATEGORIES = ['nabiał', 'mięso', 'warzywa', 'suche', 'napoje'];
const UNITS = ['kg', 'szt', 'l', 'g'];

function getStockStatus(total, min) {
  if (total <= 0) return { label: 'Brak', class: 'danger' };
  if (total < min) return { label: 'Mało', class: 'warning' };
  return { label: 'OK', class: 'success' };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pl-PL');
}

export default function WarehousePage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // expanded ingredient ID
  const [expandedId, setExpandedId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // modals
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // form state
  const [ingForm, setIngForm] = useState({ name: '', unit: 'kg', min_stock: 0, category: '' });
  const [batchForm, setBatchForm] = useState({ ingredient_id: '', quantity: '', cost_per_unit: '', expires_at: '' });
  const [saving, setSaving] = useState(false);

  async function loadIngredients() {
    try {
      setLoading(true);
      setError(null);
      const data = await getIngredients();
      setIngredients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIngredients();
  }, []);

  async function handleToggle(id) {
    if (expandedId === id) {
      setExpandedId(null);
      setBatches([]);
      return;
    }
    setExpandedId(id);
    setBatchesLoading(true);
    try {
      const data = await getIngredientBatches(id);
      setBatches(data);
    } catch (err) {
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }

  async function handleAddIngredient(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addIngredient({
        name: ingForm.name,
        unit: ingForm.unit,
        min_stock: Number(ingForm.min_stock),
        category: ingForm.category || null,
      });
      setShowIngredientForm(false);
      setIngForm({ name: '', unit: 'kg', min_stock: 0, category: '' });
      await loadIngredients();
    } catch (err) {
      alert('Błąd: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBatch(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addBatch({
        ingredient_id: batchForm.ingredient_id,
        quantity: Number(batchForm.quantity),
        cost_per_unit: batchForm.cost_per_unit ? Number(batchForm.cost_per_unit) : null,
        expires_at: batchForm.expires_at || null,
      });
      setShowBatchForm(false);
      setBatchForm({ ingredient_id: '', quantity: '', cost_per_unit: '', expires_at: '' });
      setSelectedIngredient(null);
      await loadIngredients();
      // re-fetch batches if expanded
      if (expandedId) {
        const data = await getIngredientBatches(expandedId);
        setBatches(data);
      }
    } catch (err) {
      alert('Błąd: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // low-stock alerts
  const lowStock = ingredients.filter(
    (ing) => ing.total_stock < ing.min_stock
  );

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Magazyn</h2>
        {isAdmin && (
          <div>
            <button
              className="btn btn-outline-primary me-2"
              onClick={() => setShowIngredientForm(true)}
            >
              + Dodaj składnik
            </button>
            <button
              className="btn btn-outline-success"
              onClick={() => setShowBatchForm(true)}
            >
              + Dodaj partię
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Low-stock alerts */}
      {lowStock.length > 0 && (
        <div className="alert alert-warning">
          <strong>Alerty stanów magazynowych:</strong>
          <ul className="mb-0 mt-1">
            {lowStock.map((ing) => (
              <li key={ing.id}>
                <strong>{ing.name}</strong> — stan: {ing.total_stock} {ing.unit}
                (min. {ing.min_stock} {ing.unit})
              </li>
            ))}
          </ul>
        </div>
      )}

      {ingredients.length === 0 && !error && (
        <div className="alert alert-info">Brak składników w magazynie.</div>
      )}

      {/* Ingredients table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Nazwa</th>
              <th>Kategoria</th>
              <th>Jednostka</th>
              <th>Stan</th>
              <th>Min. stan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => {
              const status = getStockStatus(ing.total_stock, ing.min_stock);
              return (
                <tr key={ing.id}>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleToggle(ing.id)}
                      title="Pokaż partie"
                    >
                      {expandedId === ing.id ? '−' : '+'}
                    </button>
                  </td>
                  <td>{ing.name}</td>
                  <td>{ing.category || '—'}</td>
                  <td>{ing.unit}</td>
                  <td>{ing.total_stock}</td>
                  <td>{ing.min_stock}</td>
                  <td>
                    <span className={`badge bg-${status.class}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded batches */}
      {expandedId && (
        <div className="card mb-3">
          <div className="card-header">
            <strong>Partie składnika</strong>
          </div>
          <div className="card-body p-0">
            {batchesLoading ? (
              <div className="text-center p-3">
                <div className="spinner-border spinner-border-sm" role="status" />
              </div>
            ) : batches.length === 0 ? (
              <p className="text-muted p-3 mb-0">Brak partii.</p>
            ) : (
              <table className="table table-sm mb-0">
                <thead className="table-secondary">
                  <tr>
                    <th>Ilość</th>
                    <th>Koszt/jedn.</th>
                    <th>Przyjęto</th>
                    <th>Ważne do</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{b.quantity}</td>
                      <td>{b.cost_per_unit != null ? `${b.cost_per_unit} zł` : '—'}</td>
                      <td>{formatDate(b.received_at)}</td>
                      <td>
                        {b.expires_at ? (
                          <span
                            className={
                              new Date(b.expires_at) < new Date()
                                ? 'text-danger fw-bold'
                                : ''
                            }
                          >
                            {formatDate(b.expires_at)}
                            {new Date(b.expires_at) < new Date() && ' (przeterminowana)'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── Add Ingredient Modal ─── */}
      {showIngredientForm && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Dodaj składnik</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowIngredientForm(false)}
                />
              </div>
              <form onSubmit={handleAddIngredient}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nazwa</label>
                    <input
                      className="form-control"
                      required
                      value={ingForm.name}
                      onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })}
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label">Jednostka</label>
                      <select
                        className="form-select"
                        value={ingForm.unit}
                        onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col">
                      <label className="form-label">Min. stan</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingForm.min_stock}
                        onChange={(e) => setIngForm({ ...ingForm, min_stock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Kategoria</label>
                    <select
                      className="form-select"
                      value={ingForm.category}
                      onChange={(e) => setIngForm({ ...ingForm, category: e.target.value })}
                    >
                      <option value="">— brak —</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowIngredientForm(false)}
                  >
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Dodaj'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Batch Modal ─── */}
      {showBatchForm && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Dodaj partię</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBatchForm(false)}
                />
              </div>
              <form onSubmit={handleAddBatch}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Składnik</label>
                    <select
                      className="form-select"
                      required
                      value={batchForm.ingredient_id}
                      onChange={(e) =>
                        setBatchForm({ ...batchForm, ingredient_id: e.target.value })
                      }
                    >
                      <option value="">— wybierz —</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label">Ilość</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={batchForm.quantity}
                        onChange={(e) =>
                          setBatchForm({ ...batchForm, quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="col">
                      <label className="form-label">Koszt / jednostkę (zł)</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={batchForm.cost_per_unit}
                        onChange={(e) =>
                          setBatchForm({ ...batchForm, cost_per_unit: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Data ważności</label>
                    <input
                      className="form-control"
                      type="date"
                      value={batchForm.expires_at}
                      onChange={(e) =>
                        setBatchForm({ ...batchForm, expires_at: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBatchForm(false)}
                  >
                    Anuluj
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Dodaj partię'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
