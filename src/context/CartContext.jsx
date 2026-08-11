import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getDishPricing } from "../utils/pricing";

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
};

export default function CartProvider({ children }) {
  const [cartKey, setCartKey] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const cartKeyRef = useRef(null);

  // ==========================================
  // SAVE CART
  // ==========================================

  useEffect(() => {
    if (!cartKey) return;

    try {
      localStorage.setItem(
        cartKey,
        JSON.stringify(cartItems)
      );
    } catch (error) {
      console.error(
        "Failed to save cart:",
        error
      );
    }
  }, [cartItems, cartKey]);

  // ==========================================
  // SET CART SESSION
  // ==========================================

  const setCartSession = useCallback((qrId) => {
    if (!qrId) return;

    const nextKey = `cart_${qrId}`;
    if (cartKeyRef.current === nextKey) return;

    let nextItems = [];
    try {
      const savedCart = localStorage.getItem(nextKey);
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      nextItems = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to load cart:", error);
    }

    cartKeyRef.current = nextKey;
    setCartKey(nextKey);
    setCartItems(nextItems);
  }, []);

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = (dish) => {
    if (!dish?._id) return;

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item._id === dish._id
      );

      if (existing) {
        return prev.map((item) =>
          item._id === dish._id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      const { basePrice, discountValue, finalPrice } = getDishPricing(dish);

      return [
        ...prev,
        {
          _id: dish._id,
          name: dish.name,
          description: dish.description || "",
          price: finalPrice,
          originalPrice: basePrice,
          discountType: dish.discountType || "percentage",
          discountValue,
          image: dish.image || "",
          foodType: dish.foodType || "veg",
          quantity: 1,
        },
      ];
    });
  };

  // ==========================================
  // INCREASE
  // ==========================================

  const increaseQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  // ==========================================
  // DECREASE
  // ==========================================

  const decreaseQty = (id) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item._id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  // ==========================================
  // REMOVE
  // ==========================================

  const removeFromCart = (id) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => item._id !== id
      )
    );
  };

  // ==========================================
  // CLEAR
  // ==========================================

  const clearCart = () => {
    const keyToClear = cartKeyRef.current || cartKey;
    setCartItems([]);

    if (keyToClear) {
      try {
        localStorage.removeItem(keyToClear);
      } catch (error) {
        console.error("Failed to clear cart:", error);
      }
    }
  };

  // ==========================================
  // TOTAL ITEMS
  // ==========================================

  const cartCount = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  // ==========================================
  // TOTAL PRICE
  // ==========================================

  const totalPrice = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        totalPrice,

        addToCart,
        increaseQty,
        decreaseQty,
        removeFromCart,
        clearCart,

        setCartSession,
        cartKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
