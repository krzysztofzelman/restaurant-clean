import { useEffect, useState, useCallback } from 'react';
import {
  getIngredients,
  getIngredientBatches,
  addIngredient,
  addBatch,
  deleteIngredient,
  deleteIngredientBatch,
  updateIngredient,
} from '../services/api';
import type {
  Ingredient,
  IngredientBatch,
} from '../lib/database.types';

interface IngredientWithStock extends Ingredient {
  total_stock: number;
}

interface IngredientForm {
  name: string;
  unit: string;
  min_stock: number;
  category: string;
}

const unitOptions = ['szt', 'kg', 'g', 'l', 'ml', 'opak'];

export default function WarehousePage() {
  const [ingredients, setIngredients] = useState<IngredientWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<IngredientWithStock | null>(null);
  const [selectedIngredient, setSelectedIngredient] =
    useState<IngredientWithStock | null>(null);
  const [batches, setBatches] = useState<IngredientBatch[]>([]);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchExpiry, setBatchExpiry] = useState('');
  const [batchCost, setBatchCost] = useState('');
  const [ingredientForm, setIngredientForm] = useState<IngredientForm>({
    name: '',
    unit: 'szt',
    min_stock: 0,
    category: '',
  });

  const loadIngredients = useCallback(async () => {
    try {
      const data = await getIngredients();
      setIngredients(data);
    } catch (err: unknown) {
      setError(
        'Błąd ładowania składników: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIngredients();
  }, [loadIngredients]);

  const loadBatches = useCallback(async (ingredientId: string) => {
    try {
      const data = await getIngredientBatches(ingredientId);
      setBatches(data);
    } catch {
      setBatches([]);
    }
  }, []);

  const handleSelectIngredient = (
    ingredient: IngredientWithStock,
  ) => {
    setSelectedIngredient(ingredient);
    loadBatches(ingredient.id);
    setShowAddBatch(false);
    setBatchQuantity('');
    setBatchExpiry('');
    setBatchCost('');
  };

  const handleAddIngredient = async () => {
    if (!ingredientForm.name.trim()) return;
    if (ingredientForm.min_stock < 0) {
      alert('Minimalny stan magazynowy nie może być ujemny.');
      return;
    }
    try {
      await addIngredient(ingredientForm);
      setShowAddIngredient(false);
      setIngredientForm({ name: '', unit: 'szt', min_stock: 0, category: '' });
      await loadIngredients();
    } catch (err: unknown) {
      alert(
        'Błąd dodawania: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleUpdateIngredient = async () => {
    if (!editingIngredient || !ingredientForm.name.trim()) return;
    if (ingredientForm.min_stock < 0) {
      alert('Minimalny stan magazynowy nie może być ujemny.');
      return;
    }
    try {
      await updateIngredient(editingIngredient.id, ingredientForm);
      setEditingIngredient(null);
      setIngredientForm({
        name: '',
        unit: 'szt',
        min_stock: 0,
        category: '',
      });
      await loadIngredients();
    } catch (err: unknown) {
      alert(
        'Błąd aktualizacji: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!window.confirm('Usunąć składnik? Może to wpłynąć na dania używające tego składnika.')) return;
    try {
      await deleteIngredient(id);
      if (selectedIngredient?.id === id) {
        setSelectedIngredient(null);
      }
      await loadIngredients();
    } catch (err: unknown) {
      alert(
        'Błąd usuwania: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleAddBatch = async () => {
    if (!selectedIngredient || !batchQuantity || Number(batchQuantity) <= 0) {
      alert('Ilość musi być większa od 0.');
      return;
    }
    try {
      await addBatch({
        ingredient_id: selectedIngredient.id,
        quantity: Number(batchQuantity),
        expires_at: batchExpiry || null,
        cost_per_unit: batchCost ? Number(batchCost) : null,
      });
      setShowAddBatch(false);
      setBatchQuantity('');
      setBatchExpiry('');
      setBatchCost('');
      await loadBatches(selectedIngredient.id);
      await loadIngredients();
    } catch (err: unknown) {
      alert(
        'Błąd dodawania partii: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Usunąć partię?')) return;
    try {
      await deleteIngredientBatch(batchId);
      if (selectedIngredient) {
        await loadBatches(selectedIngredient.id);
      }
      await loadIngredients();
    } catch (err: unknown) {
      alert(
        'Błąd usuwania partii: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const startEditIngredient = (ing: IngredientWithStock) => {
    setEditingIngredient(ing);
    setIngredientForm({
      name: ing.name,
      unit: ing.unit,
      min_stock: ing.min_stock,
      category: ing.category || '',
    });
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Magazyn</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAddIngredient(true);
            setEditingIngredient(null);
            setIngredientForm({
              name: '',
              unit: 'szt',
              min_stock: 0,
              category: '',
            });
          }}
        >
          + Dodaj składnik
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4">
        {/* ─── Ingredients list ─── */}
        <div className="col-lg-5">
          {ingredients.length === 0 ? (
            <p className="text-muted">Brak składników w magazynie.</p>
          ) : (
            <div className="list-group">
              {ingredients.map((ing) => (
                <button
                  key={ing.id}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                    selectedIngredient?.id === ing.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectIngredient(ing)}
                >
                  <div>
                    <h6 className="mb-0">{ing.name}</h6>
                    <small className="opacity-75">
                      {ing.category || 'Brak kategorii'} · {ing.unit}
                    </small>
                  </div>
                  <div className="text-end">
                    <div
                      className={`fw-bold ${
                        ing.total_stock <= ing.min_stock
                          ? 'text-danger'
                          : ''
                      }`}
                    >
                      {ing.total_stock} {ing.unit}
                    </div>
                    <small className="opacity-75">
                      min. {ing.min_stock}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Detail panel ─── */}
        <div className="col-lg-7">
          {selectedIngredient ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">{selectedIngredient.name}</h4>
                <div>
                  <button
                    className="btn btn-outline-primary btn-sm me-1"
                    onClick={() => startEditIngredient(selectedIngredient)}
                  >
                    Edytuj
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() =>
                      handleDeleteIngredient(selectedIngredient.id)
                    }
                  >
                    Usuń
                  </button>
                </div>
              </div>

              <p className="text-muted small">
                Stan magazynowy: {selectedIngredient.total_stock}{' '}
                {selectedIngredient.unit} (min.{' '}
                {selectedIngredient.min_stock})
              </p>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Partie</h5>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => setShowAddBatch(true)}
                >
                  + Dodaj partię
                </button>
              </div>

              {showAddBatch && (
                <div className="card mb-3 bg-light">
                  <div className="card-body">
                    <h6>Nowa partia</h6>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <label className="form-label">Ilość</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={batchQuantity}
                          onChange={(e) =>
                            setBatchQuantity(e.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Data ważności
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={batchExpiry}
                          onChange={(e) =>
                            setBatchExpiry(e.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Koszt (opcjonalnie)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm"
                          value={batchCost}
                          onChange={(e) =>
                            setBatchCost(e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-2 d-flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleAddBatch}
                      >
                        Zapisz
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAddBatch(false)}
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {batches.length === 0 ? (
                <p className="text-muted">
                  Brak partii dla tego składnika.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Ilość</th>
                        <th>Ważność</th>
                        <th>Koszt</th>
                        <th>Przyjęto</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.id}>
                          <td>
                            {batch.quantity} {selectedIngredient.unit}
                          </td>
                          <td>
                            {batch.expires_at
                              ? new Date(
                                  batch.expires_at,
                                ).toLocaleDateString('pl-PL')
                              : '—'}
                          </td>
                          <td>
                            {batch.cost_per_unit
                              ? `${Number(batch.cost_per_unit).toFixed(2)} zł`
                              : '—'}
                          </td>
                          <td>
                            {new Date(
                              batch.received_at,
                            ).toLocaleDateString('pl-PL')}
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-danger btn-sm py-0 px-1"
                              onClick={() =>
                                handleDeleteBatch(batch.id)
                              }
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted py-5">
              <p>Wybierz składnik z listy, aby zobaczyć szczegóły.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Add / Edit Ingredient Modal ─── */}
      {(showAddIngredient || editingIngredient) && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingIngredient ? 'Edytuj składnik' : 'Dodaj składnik'}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => {
                    setShowAddIngredient(false);
                    setEditingIngredient(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nazwa</label>
                  <input
                    type="text"
                    className="form-control"
                    value={ingredientForm.name}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Jednostka</label>
                  <select
                    className="form-select"
                    value={ingredientForm.unit}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        unit: e.target.value,
                      })
                    }
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Min. stan</label>
                  <input
                    type="number"
                    className="form-control"
                    value={ingredientForm.min_stock}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        min_stock: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Kategoria</label>
                  <input
                    type="text"
                    className="form-control"
                    value={ingredientForm.category}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        category: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddIngredient(false);
                    setEditingIngredient(null);
                  }}
                >
                  Anuluj
                </button>
                <button
                  className="btn btn-primary"
                  onClick={
                    editingIngredient
                      ? handleUpdateIngredient
                      : handleAddIngredient
                  }
                >
                  {editingIngredient ? 'Zapisz' : 'Dodaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
