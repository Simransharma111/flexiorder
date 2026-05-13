import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

const CartContext = createContext();

export const useCart = () =>
  useContext(CartContext);

export default function CartProvider({
  children,
}) {

  const { tableId } = useParams();

  // UNIQUE CART KEY
  const cartKey = tableId
    ? `cart_${tableId}`
    : "cart_default";

  // LOAD CART
  const [cartItems, setCartItems] =
    useState(() => {

      return JSON.parse(
        localStorage.getItem(cartKey)
      ) || [];

    });

  // SAVE CART
  useEffect(() => {

    localStorage.setItem(
      cartKey,
      JSON.stringify(cartItems)
    );

  }, [cartItems, cartKey]);

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

  // CLEAR CART
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
      }}
    >

      {children}

    </CartContext.Provider>

  );
}