/* eslint-disable react-refresh/only-export-components -- context + provider in one module */
import { createContext, useState } from "react";
import { API_BASE_URL } from "../utils/apiBaseUrl.js";

export const AuthContext = createContext();

export const ContextProvider = ({ children }) => {
  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [myOrders, setMyOrders] = useState([]);

  const URL = API_BASE_URL;

  const handleRemove = (id) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0),
    }));

    setCart((prevCart) =>
      prevCart
        .map((i) =>
          i._id == id ? { ...i, quantity: Math.max(i.quantity - 1, 0) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const contextValue = {
    URL,
    quantities,
    setQuantities,
    cart,
    setCart,
    user,
    setUser,
    myOrders,
    setMyOrders,
    handleRemove,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
