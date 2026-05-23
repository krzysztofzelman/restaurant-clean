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
// AdminPage deleguje do AdminOrdersTab i AdminMenuTab, które same importują stałe
import type {
  MenuItem,
  OrderWithRelations,
  Profile,
  OrderStatus,
  MenuItemIngredientWithIngredient,
  IngredientWithBatches,
} from '../lib/database.types';
import AdminOrdersTab from '../components/admin/AdminOrdersTab';
import AdminMenuTab from '../components/admin/AdminMenuTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';

type Tab = 'orders' | 'menu' | 'users';

interface MenuItemForm {
  name: string;
  description: string;
  price: string;
  category: string;
  is_available: boolean;
  image_url: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Menu form
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<MenuItemForm>({
    name: '',
    description: '',
    price: '',
    category: '',
    is_available: true,
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Recipe modal
  const [recipeModal, setRecipeModal] = useState<MenuItem | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<MenuItemIngredientWithIngredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<IngredientWithBatches[]>([]);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState('');
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    } catch (err: unknown) {
      setError(
        'Błąd ładowania danych: ' +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handlePaymentToggle(orderId: string, currentStatus: string) {
    if (!window.confirm('Czy na pewno chcesz zmienić status płatności?')) return;
    if (currentStatus === 'refunded') {
      alert('Nie można zmienić statusu płatności dla zwróconego zamówienia.');
      return;
    }
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await updatePaymentStatus(orderId, newStatus);
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleToggleAvailability(id: string, current: boolean) {
    try {
      await toggleMenuItemAvailability(id, !current);
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleSaveMenuItem(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsedPrice = parseFloat(form.price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Cena musi być liczbą większą od 0.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parsedPrice,
        category: form.category,
        is_available: form.is_available,
        image_url: form.image_url || null,
      };

      const savedItem = editItem
        ? await updateMenuItem(editItem.id, payload)
        : await addMenuItem(payload);

      if (imageFile) {
        const finalUrl = await uploadMenuImage(imageFile, savedItem.id);
        await updateMenuItem(savedItem.id, { image_url: finalUrl });
      }

      setShowForm(false);
      setEditItem(null);
      resetForm();
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(item: MenuItem) {
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
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Na pewno usunąć to danie?')) return;
    try {
      await deleteMenuItem(id);
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function resetForm() {
    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
      is_available: true,
      image_url: '',
    });
    setImageFile(null);
    setImagePreview(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: '' });
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await updateUserRole(userId, newRole);
      await loadAll();
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  // Recipe modal handlers
  async function openRecipeModal(item: MenuItem) {
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
    } catch (err: unknown) {
      alert('Błąd ładowania receptury: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRecipeLoading(false);
    }
  }

  function closeRecipeModal() {
    setRecipeModal(null);
    setRecipeIngredients([]);
    setAllIngredients([]);
  }

  async function handleAddIngredient() {
    if (!newIngredientId || !newIngredientQty || !recipeModal) return;
    if (recipeIngredients.some((ri) => ri.ingredient_id === newIngredientId)) {
      alert('Ten składnik jest już dodany do receptury.');
      return;
    }
    try {
      const added = await addMenuItemIngredient(
        recipeModal.id,
        newIngredientId,
        parseFloat(newIngredientQty),
      );
      setRecipeIngredients((prev) => [...prev, added]);
      setNewIngredientId('');
      setNewIngredientQty('');
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleDeleteIngredient(id: string) {
    if (!window.confirm('Usunąć ten składnik z receptury?')) return;
    try {
      await deleteMenuItemIngredient(id);
      setRecipeIngredients((prev) => prev.filter((ri) => ri.id !== id));
    } catch (err: unknown) {
      alert('Błąd: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

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

      {tab === 'orders' && (
        <AdminOrdersTab
          orders={orders}
          onStatusChange={handleStatusChange}
          onPaymentToggle={handlePaymentToggle}
        />
      )}

      {tab === 'menu' && (
        <AdminMenuTab
          menuItems={menuItems}
          onToggleAvailability={handleToggleAvailability}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSave={handleSaveMenuItem}
          showForm={showForm}
          setShowForm={setShowForm}
          editItem={editItem}
          form={form}
          setForm={setForm}
          imageFile={imageFile}
          imagePreview={imagePreview}
          submitting={submitting}
          handleImageChange={handleImageChange}
          removeImage={removeImage}
          resetForm={resetForm}
          recipeModal={recipeModal}
          recipeIngredients={recipeIngredients}
          allIngredients={allIngredients}
          recipeLoading={recipeLoading}
          newIngredientId={newIngredientId}
          newIngredientQty={newIngredientQty}
          openRecipeModal={openRecipeModal}
          closeRecipeModal={closeRecipeModal}
          setNewIngredientId={setNewIngredientId}
          setNewIngredientQty={setNewIngredientQty}
          onAddIngredient={handleAddIngredient}
          onDeleteIngredient={handleDeleteIngredient}
        />
      )}

      {tab === 'users' && (
        <AdminUsersTab
          profiles={profiles}
          onRoleChange={handleRoleChange}
        />
      )}
    </div>
  );
}
