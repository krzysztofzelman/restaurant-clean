import type {
  MenuItem,
  MenuItemIngredientWithIngredient,
  IngredientWithBatches,
} from '../../lib/database.types';

interface MenuItemForm {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
  image_url: string;
}

interface Props {
  menuItems: MenuItem[];
  onToggleAvailability: (id: string, current: boolean) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editItem: MenuItem | null;
  form: MenuItemForm;
  setForm: (f: MenuItemForm) => void;
  imageFile: File | null;
  imagePreview: string | null;
  submitting: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  resetForm: () => void;
  // Recipe modal
  recipeModal: MenuItem | null;
  recipeIngredients: MenuItemIngredientWithIngredient[];
  allIngredients: IngredientWithBatches[];
  recipeLoading: boolean;
  newIngredientId: string;
  newIngredientQty: string;
  openRecipeModal: (item: MenuItem) => void;
  closeRecipeModal: () => void;
  setNewIngredientId: (v: string) => void;
  setNewIngredientQty: (v: string) => void;
  onAddIngredient: () => void;
  onDeleteIngredient: (id: string) => void;
}

export default function AdminMenuTab({
  menuItems,
  onToggleAvailability,
  onEdit,
  onDelete,
  onSave,
  showForm,
  setShowForm,
  editItem,
  form,
  setForm,
  imagePreview,
  submitting,
  handleImageChange,
  removeImage,
  resetForm,
  recipeModal,
  recipeIngredients,
  allIngredients,
  recipeLoading,
  newIngredientId,
  newIngredientQty,
  openRecipeModal,
  closeRecipeModal,
  setNewIngredientId,
  setNewIngredientQty,
  onAddIngredient,
  onDeleteIngredient,
}: Props) {
  return (
    <div>
      <button
        className="btn btn-primary mb-3"
        onClick={() => {
          setShowForm(!showForm);
          if (!showForm) { resetForm(); }
        }}
      >
        {showForm ? 'Anuluj' : '+ Dodaj danie'}
      </button>

      {showForm && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h5>{editItem ? 'Edytuj danie' : 'Nowe danie'}</h5>
            <form onSubmit={onSave}>
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
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Zdjęcie</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleImageChange}
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
                        onClick={removeImage}
                      >
                        Usuń zdjęcie
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    {submitting ? 'Zapisywanie...' : (editItem ? 'Zapisz zmiany' : 'Dodaj')}
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
                  <span className={`badge bg-${item.is_available ? 'success' : 'secondary'}`}>
                    {item.is_available ? 'Tak' : 'Nie'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-outline-primary btn-sm me-1"
                    onClick={() => onEdit(item)}
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
                    onClick={() => onToggleAvailability(item.id, item.is_available)}
                  >
                    {item.is_available ? 'Ukryj' : 'Pokaż'}
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => onDelete(item.id)}
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recipe modal */}
      {recipeModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
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
                <button type="button" className="btn-close" onClick={closeRecipeModal} />
              </div>
              <div className="modal-body">
                {recipeLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border" role="status" />
                  </div>
                ) : (
                  <>
                    {recipeIngredients.length === 0 ? (
                      <p className="text-muted">Brak składników w recepturze.</p>
                    ) : (
                      <table className="table table-sm mb-4">
                        <thead>
                          <tr>
                            <th>Składnik</th>
                            <th>Ilość</th>
                            <th>Jednostka</th>
                            <th />
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
                                  onClick={() => onDeleteIngredient(ri.id)}
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
                              {ing.name} ({ing.unit})
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
                          className="btn btn-sm btn-success w-100"
                          onClick={onAddIngredient}
                          disabled={!newIngredientId || !newIngredientQty}
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
