import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const CartContext = createContext();

export const useCart = () =>
  useContext(CartContext);

export default function CartProvider({
  children,
}) {

  const [cartKey, setCartKey] =
    useState("cart_default");

  const [cartItems, setCartItems] =
    useState([]);

  // LOAD CART WHEN KEY CHANGES
  useEffect(() => {

    const savedCart =
      localStorage.getItem(cartKey);

    setCartItems(
      savedCart
        ? JSON.parse(savedCart)
        : []
    );

  }, [cartKey]);

  // SAVE CART
  useEffect(() => {

    localStorage.setItem(
      cartKey,
      JSON.stringify(cartItems)
    );

  }, [cartItems, cartKey]);

  // CHANGE ACTIVE CART
  const setCartSession = (qrId) => {

    setCartKey(`cart_${qrId}`);

  };

  // ADD
  const addToCart = (dish) => {

    setCartItems((prev) => {

      const existing = prev.find(
        (item) => item._id === dish._id
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
          ...dish,
          quantity: 1,
        },
      ];

    });

  };

  // INCREASE
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

  // DECREASE
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

  // CLEAR
  const clearCart = () => {

    setCartItems([]);

    localStorage.removeItem(cartKey);

  };

  // TOTAL
  const totalPrice =
    cartItems.reduce(
      (acc, item) =>
        acc +
        item.price * item.quantity,
      0
    );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        increaseQty,
        decreaseQty,
        clearCart,
        totalPrice,
        setCartSession,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}