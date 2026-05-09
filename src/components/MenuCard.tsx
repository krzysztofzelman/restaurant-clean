import { useCart } from '../hooks/useCart';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { MenuItem } from '../lib/database.types';

const PLACEHOLDER_IMG =
  'https://placehold.co/400x300/e9ecef/6c757d?text=Brak+zdj%C4%99cia';

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const role = profile?.role || 'user';

  const imgSrc = item.image_url || PLACEHOLDER_IMG;

  return (
    <div className="card h-100 shadow-sm">
      <img
        src={imgSrc}
        alt={item.name}
        className="card-img-top"
        style={{ height: '200px', objectFit: 'cover' }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.src = PLACEHOLDER_IMG;
        }}
      />
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{item.name}</h5>
          <span className="badge bg-primary fs-6">
            {Number(item.price).toFixed(2)} zł
          </span>
        </div>
        <p className="card-text text-muted small flex-grow-1">
          {item.description || 'Brak opisu'}
        </p>
        {role === 'user' && (
          <button
            className="btn btn-success w-100 mt-2"
            onClick={() => {
              addToCart(item);
              showToast(`Dodano „${item.name}” do koszyka 🛒`);
            }}
          >
            + Dodaj do koszyka
          </button>
        )}
      </div>
    </div>
  );
}
