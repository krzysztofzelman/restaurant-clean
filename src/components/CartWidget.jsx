import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart.jsx';

export default function CartWidget() {
  const { cart } = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link to="/cart" className="btn btn-outline-warning btn-sm position-relative">
      🛒 Koszyk
      {count > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
          {count}
        </span>
      )}
    </Link>
  );
}
