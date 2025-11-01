import { createContext, useState } from "react";


export const AuthContext = createContext();


export const ContextProvider = ({ children }) => {

  const [quantities, setQuantities] = useState({});
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [myOrders, setMyOrders] = useState([]);


  const URL = import.meta.env.VITE_API_URL;



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

  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>

  )
}