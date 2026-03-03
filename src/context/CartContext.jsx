import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false); // for glow animation
  const [limitMsg, setLimitMsg] = useState(''); // quantity limit warning

  const addToCart = useCallback((product) => {
    // product may include maxQuantityPerOrder
    const maxQty = product.maxQuantityPerOrder || null;

    let blocked = false;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        // Check limit before incrementing
        if (maxQty && existing.qty >= maxQty) {
          blocked = true;
          return prev; // don't change
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });

    if (blocked) {
      setLimitMsg(`You can only purchase ${maxQty} of "${product.title}" per order.`);
      setTimeout(() => setLimitMsg(''), 3000);
      return false;
    }

    // Trigger glow pulse
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 600);
    return true;
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const updateQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== productId));
    } else {
      setItems((prev) => {
        const item = prev.find((i) => i.id === productId);
        const maxQty = item?.maxQuantityPerOrder || null;
        if (maxQty && qty > maxQty) {
          setLimitMsg(`You can only purchase ${maxQty} of "${item.title}" per order.`);
          setTimeout(() => setLimitMsg(''), 3000);
          return prev;
        }
        return prev.map((i) => (i.id === productId ? { ...i, qty } : i));
      });
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartCount,
        subtotal,
        justAdded,
        limitMsg,
      }}
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
