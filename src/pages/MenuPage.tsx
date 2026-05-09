import { useEffect, useState } from 'react';
import { getMenuItems } from '../services/api';
import MenuCard from '../components/MenuCard';
import type { MenuItem } from '../lib/database.types';

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    getMenuItems()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          'Nie udało się załadować menu: ' +
            (err instanceof Error ? err.message : String(err)),
        );
        setLoading(false);
      });
  }, []);

  const categories: string[] = [
    ...new Set(items.map((item: MenuItem) => item.category)),
  ];

  const filteredItems: MenuItem[] =
    activeCategory === 'all'
      ? items
      : items.filter((item: MenuItem) => item.category === activeCategory);

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
          {filteredItems.map((item: MenuItem) => (
            <div key={item.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <MenuCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
