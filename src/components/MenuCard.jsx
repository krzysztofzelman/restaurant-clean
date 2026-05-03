import { useCart } from '../hooks/useCart.jsx';

export default function MenuCard({ item }) {
  const { addToCart } = useCart();

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0">{item.name}</h5>
          <span className="badge bg-primary fs-6">{item.price.toFixed(2)} zł</span>
        </div>
        <p className="card-text text-muted small flex-grow-1">
          {item.description || 'Brak opisu'}
        </p>
        <button
          className="btn btn-success w-100 mt-2"
          onClick={() => addToCart(item)}
        >
          + Dodaj do koszyka
        </button>
      </div>
    </div>
  );
}
