import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  // =====================================================
  // SESSION
  // =====================================================

  const [qrId, setQrId] = useState(null);
  const [tableId, setTableId] = useState(null);

  const [cartItems, setCartItems] = useState([]);

  const [cartLoaded, setCartLoaded] = useState(false);

  // =====================================================
  // CART STORAGE KEY
  // =====================================================

  const cartKey = qrId
    ? `cart_${qrId}`
    : null;

  // =====================================================
  // SET GUEST SESSION
  // =====================================================

  const setCartSession = ({
    qrId: newQrId,
    tableId: newTableId,
  }) => {
    if (!newQrId) {
      console.warn("QR ID missing");
      return;
    }

    setQrId(newQrId);
    setTableId(newTableId || null);
  };

  // =====================================================
  // LOAD CART
  // =====================================================

  useEffect(() => {
    if (!cartKey) {
      setCartItems([]);
      setCartLoaded(false);
      return;
    }

    try {
      const savedCart =
        localStorage.getItem(cartKey);

      if (savedCart) {
        const parsed = JSON.parse(savedCart);

        setCartItems(
          Array.isArray(parsed)
            ? parsed
            : []
        );
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error(
        "Failed to load cart:",
        error
      );

      setCartItems([]);
    }

    setCartLoaded(true);
  }, [cartKey]);

  // =====================================================
  // SAVE CART
  // =====================================================

  useEffect(() => {
    if (!cartKey || !cartLoaded) {
      return;
    }

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
  }, [
    cartItems,
    cartKey,
    cartLoaded,
  ]);

  // =====================================================
  // ADD TO CART
  // =====================================================

  const addToCart = (dish) => {
    if (!dish?._id) return;

    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          item._id === dish._id
      );

      if (existing) {
        return prev.map((item) =>
          item._id === dish._id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          _id: dish._id,
          name: dish.name,
          description: dish.description,
          price: Number(dish.price || 0),
          image: dish.image,
          foodType: dish.foodType,
          quantity: 1,
        },
      ];
    });
  };

  // =====================================================
  // INCREASE
  // =====================================================

  const increaseQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item._id === id
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );
  };

  // =====================================================
  // DECREASE
  // =====================================================

  const decreaseQty = (id) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item._id === id
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  // =====================================================
  // REMOVE ITEM
  // =====================================================

  const removeFromCart = (id) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => item._id !== id
      )
    );
  };

  // =====================================================
  // CLEAR CART
  // =====================================================

  const clearCart = () => {
    setCartItems([]);

    if (cartKey) {
      localStorage.removeItem(cartKey);
    }
  };

  // =====================================================
  // CART COUNT
  // =====================================================

  const cartCount = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  // =====================================================
  // TOTAL
  // =====================================================

  const totalPrice = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  // =====================================================
  // VALUE
  // =====================================================

  const value = {
    qrId,
    tableId,

    cartItems,
    cartCount,
    totalPrice,

    addToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,

    setCartSession,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}