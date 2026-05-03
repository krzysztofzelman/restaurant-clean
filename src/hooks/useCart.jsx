import { useState, useEffect, createContext, useContext } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('restaurant-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('restaurant-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...menuItem, quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((item) => item.id !== menuItemId));
  };

  const updateQuantity = (menuItemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
