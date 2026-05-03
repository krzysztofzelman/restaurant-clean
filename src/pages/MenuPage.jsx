import { useEffect, useState } from 'react';
import { getMenuItems } from '../services/api';
import MenuCard from '../components/MenuCard';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      const data = await getMenuItems();
      setItems(data);
    } catch (err) {
      setError('Nie udało się załadować menu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const categories = [...new Set(items.map((item) => item.category))];

  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter((item) => item.category === activeCategory);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
        <p className="mt-2">Ładowanie menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Nasze Menu</h1>

      {/* Category filter */}
      <div className="mb-4">
        <div className="btn-group flex-wrap" role="group">
          <button
            className={`btn ${activeCategory === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setActiveCategory('all')}
          >
            Wszystkie
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn ${activeCategory === cat ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <p className="text-muted">Brak dań w tej kategorii.</p>
      ) : (
        <div className="row g-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <MenuCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
